from fastapi import HTTPException, status

class AppException(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: any = None):
        super().__init__(
            status_code=status_code,
            detail={"error": {"code": code, "message": message, "details": details}}
        )

class EntityNotFoundException(AppException):
    def __init__(self, entity: str, entity_id: any):
        super().__init__(
            code="ENTITY_NOT_FOUND",
            message=f"{entity} with ID {entity_id} was not found",
            status_code=status.HTTP_404_NOT_FOUND
        )

class PermissionDeniedException(AppException):
    def __init__(self, message: str = "Access denied"):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN
        )

