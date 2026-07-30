from app.core.errors import AppError
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.enums import IntervalVisibility
from app.models.task_template import TaskTemplate
from app.models.user import User
from app.schemas.task_templates import TaskTemplateCreate, TaskTemplateResponse
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/task-templates", tags=["task-templates"])

SYSTEM_TEMPLATES = [
    ("hammam", "Сходить в хаммам", 120, IntervalVisibility.CLOSED),
    ("burmaldet", "Бурмалдеть", 60, IntervalVisibility.OPEN),
    ("massage", "Массажные столы", 90, IntervalVisibility.CLOSED),
    ("burmalda", "Готовлю бурмалду", 60, IntervalVisibility.OPEN),
]


def serialize_template(template: TaskTemplate) -> TaskTemplateResponse:
    return TaskTemplateResponse(
        id=f"user:{template.id}",
        title=template.title,
        duration_minutes=template.duration_minutes,
        visibility=template.visibility,
        system=False,
        created_at=template.created_at,
    )


@router.get("", response_model=list[TaskTemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[TaskTemplateResponse]:
    custom = list(
        await session.scalars(
            select(TaskTemplate).where(TaskTemplate.user_id == current_user.id).order_by(TaskTemplate.created_at.desc())
        )
    )
    system = [
        TaskTemplateResponse(
            id=f"system:{key}",
            title=title,
            duration_minutes=duration,
            visibility=visibility,
            system=True,
            created_at=None,
        )
        for key, title, duration, visibility in SYSTEM_TEMPLATES
    ]
    return [*system, *(serialize_template(template) for template in custom)]


@router.post("", response_model=TaskTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TaskTemplateCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TaskTemplateResponse:
    template = TaskTemplate(
        user_id=current_user.id,
        title=payload.title.strip(),
        duration_minutes=payload.duration_minutes,
        visibility=payload.visibility,
    )
    session.add(template)
    await session.commit()
    await session.refresh(template)
    return serialize_template(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    template = await session.scalar(
        select(TaskTemplate).where(
            TaskTemplate.id == template_id,
            TaskTemplate.user_id == current_user.id,
        )
    )
    if template is None:
        raise AppError(404, "template_not_found", "Шаблон не найден")
    await session.delete(template)
    await session.commit()
