from datetime import date

from pydantic import BaseModel, HttpUrl


class HolidayResponse(BaseModel):
    title: str
    category: str
    date: date
    source_url: HttpUrl
