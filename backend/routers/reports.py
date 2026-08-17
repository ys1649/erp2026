import glob
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

CUSTOMER_REPORT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "Report", "Customer",
)


@router.get("/customer")
def list_customer_reports():
    """Return sorted list of .mrt filenames (without extension) in Report\\Customer."""
    if not os.path.isdir(CUSTOMER_REPORT_DIR):
        return []
    files = glob.glob(os.path.join(CUSTOMER_REPORT_DIR, "*.mrt"))
    return sorted(os.path.splitext(os.path.basename(f))[0] for f in files)


@router.get("/customer/{filename}")
def get_customer_report(filename: str):
    """Serve a single .mrt file from Report\\Customer."""
    if any(c in filename for c in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(CUSTOMER_REPORT_DIR, f"{filename}.mrt")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Report not found")
    return FileResponse(
        path,
        media_type="application/json; charset=utf-8",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
