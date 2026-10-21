import asyncio
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.types import ASGIApp, Message, Receive, Scope, Send
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.session import engine, Base
from backend.app.db.migrations import migrate_legacy_knowledge_workspaces
from backend.app.api.v1.router import api_router
from backend.app.services.reminder_service import start_reminder_scheduler_task


class KnowledgeUploadLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["method"] != "POST":
            await self.app(scope, receive, send)
            return

        path = scope["path"]
        document_route = f"{settings.API_V1_STR}/knowledge/documents"
        is_upload = path == document_route or (
            path.startswith(document_route + "/") and path.endswith("/versions")
        )
        if not is_upload:
            await self.app(scope, receive, send)
            return

        max_body_size = settings.KNOWLEDGE_MAX_UPLOAD_BYTES + 64 * 1024
        content_length = next(
            (
                value.decode("latin-1")
                for key, value in scope.get("headers", [])
                if key.lower() == b"content-length"
            ),
            None,
        )
        if content_length is not None:
            try:
                if int(content_length) > max_body_size:
                    response = JSONResponse(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        content={"detail": "Knowledge upload request exceeds the configured size limit."},
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                response = JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"detail": "Invalid Content-Length header."},
                )
                await response(scope, receive, send)
                return

        received_bytes = 0
        limit_exceeded = False

        async def limited_receive() -> Message:
            nonlocal received_bytes, limit_exceeded
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > max_body_size:
                    limit_exceeded = True
                    return {"type": "http.disconnect"}
            return message

        async def limited_send(message: Message) -> None:
            if not limit_exceeded:
                await send(message)

        try:
            await self.app(scope, limited_receive, limited_send)
        except Exception:
            if not limit_exceeded:
                raise

        if limit_exceeded:
            response = JSONResponse(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                content={"detail": "Knowledge upload request exceeds the configured size limit."},
            )
            await response(scope, receive, send)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    migrate_legacy_knowledge_workspaces(engine)
    logger.info("Database initialized successfully.")

    # Start background scheduler
    scheduler_task = asyncio.create_task(start_reminder_scheduler_task())
    logger.info("StudentOS background worker started.")

    yield

    # Shutdown
    logger.info("Shutting down background workers...")
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass
    logger.info("StudentOS service stopped cleanly.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="StudentOS - AI-Powered Academic Productivity & Operating System",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration: strict explicit origins with credentials
app.add_middleware(KnowledgeUploadLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def enforce_cookie_request_origin(request: Request, call_next):
    if (
        request.method in {"POST", "PUT", "PATCH", "DELETE"}
        and request.cookies.get("studentos_session")
        and not request.headers.get("Authorization")
        and request.headers.get("origin") not in settings.BACKEND_CORS_ORIGINS
    ):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": "Cross-origin request blocked."},
        )
    return await call_next(request)


@app.middleware("http")
async def add_security_headers_and_logging(request: Request, call_next):
    correlation_id = str(uuid.uuid4())
    start_time = time.time()
    
    # Process request
    try:
        response: Response = await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled server error [Correlation: {correlation_id}]: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred. Correlation ID: " + correlation_id}
        )

    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(f"{request.method} {request.url.path} - {response.status_code} ({duration_ms}ms) [{correlation_id}]")

    # Security Headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["X-Correlation-ID"] = correlation_id
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": exc.errors(), "message": "Validation failed for request parameters."}
    )


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "status": "operational"
    }
