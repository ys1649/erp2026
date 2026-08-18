from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import customers, reports, data_dict

app = FastAPI(title="ERP2026 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(data_dict.router, prefix="/api/datadict", tags=["data-dict"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
