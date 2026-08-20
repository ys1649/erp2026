/*==============================================================*/
/* Database name:  SYSREPORT                                    */
/* DBMS name:      ORACLE Version 8 (Deprecated)                */
/* Created on:     2026/8/19 下午 04:59:32                        */
/*==============================================================*/


ALTER TABLE TBLSYSREPORTFIELD
   DROP CONSTRAINT FK_TBLSYSRE_REFERENCE_TBLDD;

ALTER TABLE TBLSYSREPORTFIELD
   DROP CONSTRAINT FK_TBLSYSRE_REF_804_TBLSYSRE;

DROP TABLE TBLSYSREPORT CASCADE CONSTRAINTS;

DROP INDEX REF_804_PK;

DROP TABLE TBLSYSREPORTFIELD CASCADE CONSTRAINTS;

DROP SEQUENCE S_DDD_ID;

DROP SEQUENCE S_SRP_ID;

CREATE SEQUENCE S_DDD_ID;

CREATE SEQUENCE S_SRP_ID;

/*==============================================================*/
/* Table: TBLSYSREPORT                                          */
/*==============================================================*/
CREATE TABLE TBLSYSREPORT  (
   SRP_ID               NUMBER(9)                      DEFAULT S_SRP_ID.NEXTVAL  NOT NULL,
   SRP_CODE             VARCHAR2(80)                     NOT NULL,
   SRP_NAME             VARCHAR2(80)                     NOT NULL,
   SRP_DESCRIPTION      VARCHAR2(255),
   SRP_SQL              VARCHAR2(4000)                   NOT NULL,
   SRP_REPORTFILE       CLOB,
   ORDERBY_LIST         VARCHAR2(255),
   CONSTRAINT PK_TBLSYSREPORT PRIMARY KEY (SRP_ID),
   CONSTRAINT AK_SRP_CODE_TBLSYSRE UNIQUE (SRP_CODE)
);

COMMENT ON COLUMN TBLSYSREPORT.ORDERBY_LIST IS
'排序欄位清單，JSON 逗號分隔，報表查詢畫面時，會出現排序清單內，USER 可以上下移動排列順序並ˇ指定遞增、遞減
JSON 以陣列表示，每個陣列2-3個元素
元素1=欄位名稱
元素2=欄位顯示名稱
元素3 (可省略)=ASC 或 DESC  遞增或遞減，預設=ASC
格式如下:
[CUM_NO,客戶編號,DESC],
[CUM_NAME,客戶名稱]


';


INSERT INTO TBLSYSREPORT (SRP_ID, SRP_CODE, SRP_NAME, SRP_DESCRIPTION, SRP_SQL, SRP_REPORTFILE, ORDERBY_LIST)
VALUES (1, 'M_Customer', '客戶清單', NULL, 'SELECT A.*
FROM TBL_CUSTOMER A
WHERE A.CUM_NO = :CUM_NO
  AND A.CUM_NAME LIKE :CUM_NAME
  AND A.CUM_NO BETWEEN :CUM_NO_From AND :CUM_NO_To', '<CLOB>', '[CUM_NO,客戶編號,DESC],[CUM_NAME,客戶名稱]');

COMMIT;


/*==============================================================*/
/* Table: TBLSYSREPORTFIELD                                     */
/*==============================================================*/
CREATE TABLE TBLSYSREPORTFIELD  (
   SRP_ID               NUMBER(9)                        NOT NULL,
   SRF_SEQNO            NUMBER(9)                        NOT NULL,
   SRF_FIELDVARNAME     VARCHAR2(80)                     NOT NULL,
   SRF_DISPNAME         VARCHAR2(80)                     NOT NULL,
   SRF_DISPORDER        NUMBER(9)                        NOT NULL,
   SRF_DATATYPE         VARCHAR2(20),
   SRF_CONTROLTYPE      VARCHAR2(20)                     NOT NULL,
   SRF_ISMUSTCRITERIA   NUMBER(1)                        NOT NULL,
   SRF_LIST_VALUE       VARCHAR2(4000),
   DDM_NO               VARCHAR2(80),
   DEFAULT_VAL          VARCHAR2(80),
   CONSTRAINT PK_TBLSYSREPORTFIELD PRIMARY KEY (SRP_ID, SRF_SEQNO)
);

COMMENT ON COLUMN TBLSYSREPORTFIELD.SRF_DATATYPE IS
'TEXT,NUMBER,BOOLEAN';

COMMENT ON COLUMN TBLSYSREPORTFIELD.SRF_CONTROLTYPE IS
'TEXT
NUMBER
BOOLEAN:顯示 CHECKBOX ，SQL VALUE 自動轉成 0 或 1
LIST:需搭配 SRF_LIST_VALUE
DD:透過資料字典選取，必須指定 DDM_NO ，系統顯示資料字典 LOOKUP  選擇
';

COMMENT ON COLUMN TBLSYSREPORTFIELD.SRF_ISMUSTCRITERIA IS
'若是必要條件，則 user 必須輸入';

COMMENT ON COLUMN TBLSYSREPORTFIELD.SRF_LIST_VALUE IS
'當控制項類別是LIST時，這個欄位存放逗號分隔的選項內容';

COMMENT ON COLUMN TBLSYSREPORTFIELD.DDM_NO IS
'資料字典主檔編號';

COMMENT ON COLUMN TBLSYSREPORTFIELD.DEFAULT_VAL IS
'預設值';

/*==============================================================*/
/* Index: REF_804_PK                                            */
/*==============================================================*/
CREATE INDEX REF_804_PK ON TBLSYSREPORTFIELD (
   SRP_ID ASC
);

ALTER TABLE TBLSYSREPORTFIELD
   ADD CONSTRAINT FK_TBLSYSRE_REFERENCE_TBLDD FOREIGN KEY (DDM_NO)
      REFERENCES TBLDD (DDM_NO);

ALTER TABLE TBLSYSREPORTFIELD
   ADD CONSTRAINT FK_TBLSYSRE_REF_804_TBLSYSRE FOREIGN KEY (SRP_ID)
      REFERENCES TBLSYSREPORT (SRP_ID);

