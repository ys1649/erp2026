import oracledb
from contextlib import contextmanager

DSN = "JNVB2BWEB01.cminl.oa:1521/orcl.cminl.oa"
USER = "erp2026"
PASSWORD = "erp2026"

@contextmanager
def get_conn():
    conn = oracledb.connect(user=USER, password=PASSWORD, dsn=DSN)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
