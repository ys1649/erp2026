/*==============================================================*/
/* Database name:  SYSREPORT                                    */
/* DBMS name:      ORACLE Version 8 (Deprecated)                */
/* Created on:     2026/8/18 下午 03:04:33                        */
/*==============================================================*/


ALTER TABLE TBL_DDFIELD
   DROP CONSTRAINT FK_TBL_DDFI_REFERENCE_TBLDD;

DROP TABLE TBLDD CASCADE CONSTRAINTS;

DROP TABLE TBL_DDFIELD CASCADE CONSTRAINTS;

DROP SEQUENCE S_DDD_ID;

CREATE SEQUENCE S_DDD_ID;

/*==============================================================*/
/* Table: TBLDD                                                 */
/*==============================================================*/
CREATE TABLE TBLDD  (
   DDM_NO               VARCHAR2(80)                     NOT NULL,
   DDM_NAME             VARCHAR2(80)                     NOT NULL,
   DDM_SQL              VARCHAR2(4000),
   IS_MULTI_SELECTED    CHAR(10),
   RET_VAL_FIELD        VARCHAR2(80),
   CONSTRAINT PK_TBLDD PRIMARY KEY (DDM_NO)
);

COMMENT ON TABLE TBLDD IS
'資料字典主檔
資料字典主檔用查詢主檔欄位時，出現Loopup 畫面讓 USER 快速篩選資料';

COMMENT ON COLUMN TBLDD.DDM_NO IS
'資料字典主檔編號';

COMMENT ON COLUMN TBLDD.DDM_NAME IS
'資料字典主檔名稱';

COMMENT ON COLUMN TBLDD.DDM_SQL IS
'定義資料字典的來源資料 SQL';

COMMENT ON COLUMN TBLDD.IS_MULTI_SELECTED IS
'是否允許多選';

COMMENT ON COLUMN TBLDD.RET_VAL_FIELD IS
'user 選擇後，返回值的欄位名稱，
不管是否多選，回傳值都是 JSON ARRAY 格式';

/*==============================================================*/
/* Table: TBL_DDFIELD                                           */
/*==============================================================*/
CREATE TABLE TBL_DDFIELD  (
   DDD_ID               NUMBER(9)                      DEFAULT S_DDD_ID.NEXTVAL  NOT NULL,
   DDM_NO               VARCHAR2(80),
   DDD_FIELD            VARCHAR2(80),
   DDD_FIELD_DISP       VARCHAR2(80),
   CONSTRAINT PK_TBL_DDFIELD PRIMARY KEY (DDD_ID),
   CONSTRAINT AK_KEY_2_TBL_DDFI UNIQUE (DDM_NO, DDD_FIELD_DISP)
);

COMMENT ON TABLE TBL_DDFIELD IS
'資料字典欄位定義';

COMMENT ON COLUMN TBL_DDFIELD.DDM_NO IS
'資料字典主檔編號';

COMMENT ON COLUMN TBL_DDFIELD.DDD_FIELD IS
'欄位名稱';

COMMENT ON COLUMN TBL_DDFIELD.DDD_FIELD_DISP IS
'欄位顯示';

ALTER TABLE TBL_DDFIELD
   ADD CONSTRAINT FK_TBL_DDFI_REFERENCE_TBLDD FOREIGN KEY (DDM_NO)
      REFERENCES TBLDD (DDM_NO);

