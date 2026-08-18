import re

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from database import get_conn

router = APIRouter()

IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_$#]*$")


class DictMasterCreate(BaseModel):
    ddm_no: str
    ddm_name: str
    ddm_sql: str
    ret_val_field: Optional[str] = None
    is_multi_selected: str = "N"


class DictMasterUpdate(BaseModel):
    ddm_name: str
    ddm_sql: str
    ret_val_field: Optional[str] = None
    is_multi_selected: str = "N"


class DictFieldCreate(BaseModel):
    ddd_field: str
    ddd_field_disp: str


class DictFieldUpdate(BaseModel):
    ddd_field: str
    ddd_field_disp: str


def row_to_dict(cur, row):
    return dict(zip([d[0].lower() for d in cur.description], row))


def _validate_select_sql(sql: str) -> str:
    s = (sql or "").strip().rstrip(";").strip()
    if not s:
        raise HTTPException(400, "DDM_SQL 不可為空")
    if not re.match(r"(?is)^select\b", s):
        raise HTTPException(400, "DDM_SQL 僅允許 SELECT 查詢")
    if ";" in s:
        raise HTTPException(400, "DDM_SQL 不可包含多重陳述式")
    return s


# ── 資料字典主檔 ──────────────────────────────────────────────


@router.get("")
def list_masters(
    q: Optional[str] = Query(None, description="搜尋資料字典編號/名稱"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    with get_conn() as conn:
        cur = conn.cursor()
        where = ""
        params: dict = {}
        if q and q.strip():
            where = "WHERE UPPER(DDM_NO) LIKE UPPER(:q1) OR UPPER(DDM_NAME) LIKE UPPER(:q2)"
            pq = f"%{q.strip()}%"
            params = {"q1": pq, "q2": pq}

        cur.execute(f"SELECT COUNT(*) FROM TBLDD {where}", params)
        total = cur.fetchone()[0]

        offset = (page - 1) * page_size
        cur.execute(
            f"""SELECT DDM_NO,DDM_NAME,DDM_SQL,TRIM(IS_MULTI_SELECTED) AS IS_MULTI_SELECTED,
                       RET_VAL_FIELD
                  FROM TBLDD {where}
                 ORDER BY DDM_NO
                OFFSET :offset ROWS FETCH NEXT :lim ROWS ONLY""",
            {**params, "offset": offset, "lim": page_size},
        )
        rows = [row_to_dict(cur, r) for r in cur.fetchall()]
        return {"total": total, "page": page, "page_size": page_size, "data": rows}


@router.get("/{ddm_no}")
def get_master(ddm_no: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT DDM_NO,DDM_NAME,DDM_SQL,TRIM(IS_MULTI_SELECTED) AS IS_MULTI_SELECTED,
                      RET_VAL_FIELD
                 FROM TBLDD WHERE DDM_NO=:id""",
            {"id": ddm_no},
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "資料字典不存在")
        return row_to_dict(cur, row)


@router.post("", status_code=201)
def create_master(data: DictMasterCreate):
    _validate_select_sql(data.ddm_sql)
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """INSERT INTO TBLDD (DDM_NO,DDM_NAME,DDM_SQL,IS_MULTI_SELECTED,RET_VAL_FIELD)
                   VALUES (:ddm_no,:ddm_name,:ddm_sql,:is_multi_selected,:ret_val_field)""",
                data.model_dump(),
            )
        except Exception as e:
            if "ORA-00001" in str(e):
                raise HTTPException(409, "資料字典編號已存在")
            raise
        return {"message": "新增成功", "ddm_no": data.ddm_no}


@router.put("/{ddm_no}")
def update_master(ddm_no: str, data: DictMasterUpdate):
    _validate_select_sql(data.ddm_sql)
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """UPDATE TBLDD SET DDM_NAME=:ddm_name,DDM_SQL=:ddm_sql,
                   IS_MULTI_SELECTED=:is_multi_selected,RET_VAL_FIELD=:ret_val_field
               WHERE DDM_NO=:ddm_no""",
            {**data.model_dump(), "ddm_no": ddm_no},
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "資料字典不存在")
        return {"message": "更新成功"}


@router.delete("/{ddm_no}")
def delete_master(ddm_no: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM TBL_DDFIELD WHERE DDM_NO=:id", {"id": ddm_no})
        cur.execute("DELETE FROM TBLDD WHERE DDM_NO=:id", {"id": ddm_no})
        if cur.rowcount == 0:
            raise HTTPException(404, "資料字典不存在")
        return {"message": "刪除成功"}


# ── 資料字典欄位定義 ──────────────────────────────────────────


@router.get("/{ddm_no}/fields")
def list_fields(ddm_no: str):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT DDD_ID,DDM_NO,DDD_FIELD,DDD_FIELD_DISP
                 FROM TBL_DDFIELD WHERE DDM_NO=:id ORDER BY DDD_ID""",
            {"id": ddm_no},
        )
        return [row_to_dict(cur, r) for r in cur.fetchall()]


@router.post("/{ddm_no}/fields", status_code=201)
def create_field(ddm_no: str, data: DictFieldCreate):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM TBLDD WHERE DDM_NO=:id", {"id": ddm_no})
        if not cur.fetchone():
            raise HTTPException(404, "資料字典不存在")
        out_id = cur.var(int)
        try:
            cur.execute(
                """INSERT INTO TBL_DDFIELD (DDM_NO,DDD_FIELD,DDD_FIELD_DISP)
                   VALUES (:ddm_no,:ddd_field,:ddd_field_disp)
                   RETURNING DDD_ID INTO :out_id""",
                {
                    "ddm_no": ddm_no,
                    "ddd_field": data.ddd_field,
                    "ddd_field_disp": data.ddd_field_disp,
                    "out_id": out_id,
                },
            )
        except Exception as e:
            if "ORA-00001" in str(e):
                raise HTTPException(409, "此資料字典已存在相同顯示名稱的欄位")
            raise
        return {"message": "新增成功", "ddd_id": out_id.getvalue()[0]}


@router.put("/{ddm_no}/fields/{ddd_id}")
def update_field(ddm_no: str, ddd_id: int, data: DictFieldUpdate):
    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute(
                """UPDATE TBL_DDFIELD SET DDD_FIELD=:ddd_field,DDD_FIELD_DISP=:ddd_field_disp
                   WHERE DDD_ID=:ddd_id AND DDM_NO=:ddm_no""",
                {**data.model_dump(), "ddd_id": ddd_id, "ddm_no": ddm_no},
            )
        except Exception as e:
            if "ORA-00001" in str(e):
                raise HTTPException(409, "此資料字典已存在相同顯示名稱的欄位")
            raise
        if cur.rowcount == 0:
            raise HTTPException(404, "欄位定義不存在")
        return {"message": "更新成功"}


@router.delete("/{ddm_no}/fields/{ddd_id}")
def delete_field(ddm_no: str, ddd_id: int):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM TBL_DDFIELD WHERE DDD_ID=:ddd_id AND DDM_NO=:ddm_no",
            {"ddd_id": ddd_id, "ddm_no": ddm_no},
        )
        if cur.rowcount == 0:
            raise HTTPException(404, "欄位定義不存在")
        return {"message": "刪除成功"}


@router.post("/{ddm_no}/fields/auto-generate")
def auto_generate_fields(ddm_no: str):
    """依 TBLDD.DDM_SQL 的欄位結構重新產生 TBL_DDFIELD 內容，已存在的欄位保留原顯示名稱。"""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT DDM_SQL FROM TBLDD WHERE DDM_NO=:id", {"id": ddm_no})
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "資料字典不存在")
        sql = _validate_select_sql(row[0])

        try:
            cur.execute(f"SELECT * FROM ({sql}) WHERE 1=0")
        except Exception as e:
            raise HTTPException(400, f"DDM_SQL 執行失敗: {e}")
        cols = [d[0] for d in cur.description]
        if not cols:
            raise HTTPException(400, "DDM_SQL 未回傳任何欄位")

        cur.execute(
            "SELECT DDD_FIELD,DDD_FIELD_DISP FROM TBL_DDFIELD WHERE DDM_NO=:id",
            {"id": ddm_no},
        )
        existing = {r[0]: r[1] for r in cur.fetchall()}

        cur.execute("DELETE FROM TBL_DDFIELD WHERE DDM_NO=:id", {"id": ddm_no})
        for col in cols:
            cur.execute(
                """INSERT INTO TBL_DDFIELD (DDM_NO,DDD_FIELD,DDD_FIELD_DISP)
                   VALUES (:ddm_no,:f,:d)""",
                {"ddm_no": ddm_no, "f": col, "d": existing.get(col, col)},
            )

        cur.execute(
            """SELECT DDD_ID,DDM_NO,DDD_FIELD,DDD_FIELD_DISP
                 FROM TBL_DDFIELD WHERE DDM_NO=:id ORDER BY DDD_ID""",
            {"id": ddm_no},
        )
        return [row_to_dict(cur, r) for r in cur.fetchall()]


# ── 資料字典 Lookup ──────────────────────────────────────────


@router.get("/{ddm_no}/meta")
def get_lookup_meta(ddm_no: str):
    """提供前端「資料字典Lookup」元件所需的定義：主檔資訊 + 欄位清單。"""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """SELECT DDM_NO,DDM_NAME,TRIM(IS_MULTI_SELECTED) AS IS_MULTI_SELECTED,
                      RET_VAL_FIELD
                 FROM TBLDD WHERE DDM_NO=:id""",
            {"id": ddm_no},
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "資料字典不存在")
        meta = row_to_dict(cur, row)

        cur.execute(
            """SELECT DDD_ID,DDD_FIELD,DDD_FIELD_DISP
                 FROM TBL_DDFIELD WHERE DDM_NO=:id ORDER BY DDD_ID""",
            {"id": ddm_no},
        )
        meta["fields"] = [row_to_dict(cur, r) for r in cur.fetchall()]
        return meta


@router.get("/{ddm_no}/data")
def get_lookup_data(ddm_no: str, q: Optional[str] = Query(None, description="快速搜尋關鍵字")):
    """執行 DDM_SQL 取得 Lookup 資料，欄位名稱維持 Oracle 原始大小寫，供前端依 DDD_FIELD 取值。"""
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT DDM_SQL FROM TBLDD WHERE DDM_NO=:id", {"id": ddm_no})
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "資料字典不存在")
        sql = _validate_select_sql(row[0])

        cur.execute("SELECT DDD_FIELD FROM TBL_DDFIELD WHERE DDM_NO=:id", {"id": ddm_no})
        fields = [r[0] for r in cur.fetchall()]
        if not fields:
            raise HTTPException(400, "尚未定義欄位，請先產生欄位定義")

        where = ""
        params: dict = {}
        if q and q.strip():
            searchable = [f for f in fields if f and IDENTIFIER_RE.match(f)]
            if searchable:
                conds = " OR ".join(f"UPPER(TO_CHAR({c})) LIKE UPPER(:q)" for c in searchable)
                where = f"WHERE {conds}"
                params["q"] = f"%{q.strip()}%"

        try:
            cur.execute(f"SELECT * FROM ({sql}) BASE_Q {where}", params)
        except Exception as e:
            raise HTTPException(400, f"DDM_SQL 執行失敗: {e}")
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]
