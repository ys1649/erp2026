from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import get_conn

router = APIRouter()


class CustomerCreate(BaseModel):
    cum_no: str
    cum_name: str
    cum_president: Optional[str] = None
    cum_contant: Optional[str] = None
    cum_cont_title: Optional[str] = None
    cum_tel1: Optional[str] = None
    cum_tel2: Optional[str] = None
    cum_fax: Optional[str] = None
    cum_uniform_no: Optional[str] = None
    cum_inv_addr: Optional[str] = None
    cum_addr: Optional[str] = None
    cum_zip_code: Optional[str] = None
    cum_advance_amount: float = 0
    cum_desc: Optional[str] = None
    cum_acnt_ar: str = "1141"
    cum_acnt_advance: str = "2261"
    cum_inv_rate: float = 0.05


class CustomerUpdate(BaseModel):
    cum_name: str
    cum_president: Optional[str] = None
    cum_contant: Optional[str] = None
    cum_cont_title: Optional[str] = None
    cum_tel1: Optional[str] = None
    cum_tel2: Optional[str] = None
    cum_fax: Optional[str] = None
    cum_uniform_no: Optional[str] = None
    cum_inv_addr: Optional[str] = None
    cum_addr: Optional[str] = None
    cum_zip_code: Optional[str] = None
    cum_advance_amount: float = 0
    cum_desc: Optional[str] = None
    cum_acnt_ar: str = "1141"
    cum_acnt_advance: str = "2261"
    cum_inv_rate: float = 0.05


def row_to_dict(cur, row):
    return dict(zip([d[0].lower() for d in cur.description], row))


@router.get("")
def list_customers(
    q: Optional[str] = Query(None, description="搜尋客戶編號/名稱/統編"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    with get_conn() as conn:
        cur = conn.cursor()
        where = ""
        params: dict = {}
        if q and q.strip():
            where = """WHERE UPPER(CUM_NO) LIKE UPPER(:q1)
                          OR UPPER(CUM_NAME) LIKE UPPER(:q2)
                          OR CUM_UNIFORM_NO LIKE :q3"""
            pq = f"%{q.strip()}%"
            params = {"q1": pq, "q2": pq, "q3": pq}

        cur.execute(f"SELECT COUNT(*) FROM TBL_CUSTOMER {where}", params)
        total = cur.fetchone()[0]

        offset = (page - 1) * page_size
        cur.execute(
            f"""SELECT CUM_NO,CUM_NAME,CUM_PRESIDENT,CUM_CONTANT,CUM_CONT_TITLE,
                       CUM_TEL1,CUM_TEL2,CUM_FAX,CUM_UNIFORM_NO,
                       CUM_INV_ADDR,CUM_ADDR,CUM_ZIP_CODE,
                       CUM_ADVANCE_AMOUNT,CUM_DESC,CUM_CREATOR,
                       CUM_ACNT_AR,CUM_ACNT_ADVANCE,CUM_INV_RATE
                FROM TBL_CUSTOMER {where}
               ORDER BY CUM_NO
               OFFSET :offset ROWS FETCH NEXT :lim ROWS ONLY""",
            {**params, "offset": offset, "lim": page_size},
        )
        rows = [row_to_dict(cur, r) for r in cur.fetchall()]
        return {"total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/report-data")
def report_data(q: Optional[str] = Query(None)):
    """Stimulsoft JSON data source — returns customer list with Chinese column aliases."""
    with get_conn() as conn:
        cur = conn.cursor()
        where = ""
        params: dict = {}
        if q and q.strip():
            where = "WHERE UPPER(CUM_NAME) LIKE UPPER(:q)"
            params = {"q": f"%{q.strip()}%"}

        cur.execute(
            f"""SELECT CUM_NO        AS "客戶編號",
                       CUM_NAME      AS "客戶名稱",
                       CUM_PRESIDENT AS "負責人",
                       CUM_CONTANT   AS "聯絡人",
                       CUM_CONT_TITLE AS "聯絡人職稱",
                       CUM_TEL1      AS "電話",
                       CUM_FAX       AS "傳真",
                       CUM_UNIFORM_NO AS "統一編號",
                       CUM_ZIP_CODE  AS "郵遞區號",
                       CUM_ADDR      AS "公司地址",
                       CUM_INV_ADDR  AS "發票地址",
                       CUM_INV_RATE  AS "稅率",
                       CUM_ADVANCE_AMOUNT AS "預收款餘額",
                       CUM_ACNT_AR   AS "應收帳款科目",
                       CUM_DESC      AS "說明"
                  FROM TBL_CUSTOMER {where}
                 ORDER BY CUM_NO""",
            params,
        )
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


@router.get("/{cum_no}")
def get_customer(cum_no: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT CUM_NO,CUM_NAME,CUM_PRESIDENT,CUM_CONTANT,CUM_CONT_TITLE,
                      CUM_TEL1,CUM_TEL2,CUM_FAX,CUM_UNIFORM_NO,
                      CUM_INV_ADDR,CUM_ADDR,CUM_ZIP_CODE,
                      CUM_ADVANCE_AMOUNT,CUM_DESC,CUM_CREATOR,
                      CUM_ACNT_AR,CUM_ACNT_ADVANCE,CUM_INV_RATE
               FROM TBL_CUSTOMER WHERE CUM_NO=:id""",
            {"id": cum_no},
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "客戶不存在")
        return row_to_dict(cur, row)


@router.post("", status_code=201)
def create_customer(data: CustomerCreate):
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """INSERT INTO TBL_CUSTOMER
                       (CUM_NO,CUM_NAME,CUM_PRESIDENT,CUM_CONTANT,CUM_CONT_TITLE,
                        CUM_TEL1,CUM_TEL2,CUM_FAX,CUM_UNIFORM_NO,
                        CUM_INV_ADDR,CUM_ADDR,CUM_ZIP_CODE,
                        CUM_ADVANCE_AMOUNT,CUM_DESC,CUM_CREATOR,
                        CUM_ACNT_AR,CUM_ACNT_ADVANCE,CUM_INV_RATE)
                   VALUES(:cum_no,:cum_name,:cum_president,:cum_contant,:cum_cont_title,
                          :cum_tel1,:cum_tel2,:cum_fax,:cum_uniform_no,
                          :cum_inv_addr,:cum_addr,:cum_zip_code,
                          :cum_advance_amount,:cum_desc,'WYS',
                          :cum_acnt_ar,:cum_acnt_advance,:cum_inv_rate)""",
                data.model_dump(),
            )
        except Exception as e:
            if "ORA-00001" in str(e):
                raise HTTPException(409, "客戶編號已存在")
            raise
        return {"message": "新增成功", "cum_no": data.cum_no}


@router.put("/{cum_no}")
def update_customer(cum_no: str, data: CustomerUpdate):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """UPDATE TBL_CUSTOMER SET
                   CUM_NAME=:cum_name,CUM_PRESIDENT=:cum_president,
                   CUM_CONTANT=:cum_contant,CUM_CONT_TITLE=:cum_cont_title,
                   CUM_TEL1=:cum_tel1,CUM_TEL2=:cum_tel2,CUM_FAX=:cum_fax,
                   CUM_UNIFORM_NO=:cum_uniform_no,CUM_INV_ADDR=:cum_inv_addr,
                   CUM_ADDR=:cum_addr,CUM_ZIP_CODE=:cum_zip_code,
                   CUM_ADVANCE_AMOUNT=:cum_advance_amount,CUM_DESC=:cum_desc,
                   CUM_ACNT_AR=:cum_acnt_ar,CUM_ACNT_ADVANCE=:cum_acnt_advance,
                   CUM_INV_RATE=:cum_inv_rate
               WHERE CUM_NO=:cum_no""",
            {**data.model_dump(), "cum_no": cum_no},
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "客戶不存在")
        return {"message": "更新成功"}


@router.delete("/{cum_no}")
def delete_customer(cum_no: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM TBL_CUSTOMER WHERE CUM_NO=:id", {"id": cum_no})
        if cur.rowcount == 0:
            raise HTTPException(404, "客戶不存在")
        return {"message": "刪除成功"}
