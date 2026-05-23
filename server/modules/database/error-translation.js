function createDatabaseErrorTranslator({ createHttpError }) {
  return (error) => {
    if (!error || typeof error !== "object") {
      return createHttpError(500, "알 수 없는 오류가 발생했습니다.", "UNKNOWN_ERROR");
    }

    if (error.statusCode) {
      return error;
    }

    const errorMessage = String(error.message || "");

    if (errorMessage.includes("auth_gssapi_client")) {
      return createHttpError(
        503,
        [
          "DB 계정이 MariaDB GSSAPI 인증(auth_gssapi_client)을 사용하고 있어 Node.js 드라이버가 접속할 수 없습니다.",
          "DB_USER/DB_PASSWORD에 비밀번호 인증 계정을 설정하세요.",
          "관리자 계정으로 scripts/create-db-user.sql을 실행한 뒤 .env를 갱신하면 됩니다.",
        ].join(" "),
        "DB_AUTH_PLUGIN_UNSUPPORTED",
      );
    }

    switch (String(error.code || "")) {
      case "ER_DUP_ENTRY":
        return createHttpError(409, "이미 존재하는 데이터입니다.", "DUPLICATE_ENTRY");
      case "ER_ACCESS_DENIED_ERROR":
        return createHttpError(
          503,
          "DB 계정으로 로그인할 수 없습니다. scripts/create-db-user.sql을 관리자 계정으로 실행하고 .env의 DB_USER/DB_PASSWORD 값을 확인하세요.",
          "DB_ACCESS_DENIED",
        );
      case "ER_NO_SUCH_TABLE":
        return createHttpError(500, "DB 스키마가 준비되지 않았습니다. setup:db를 먼저 실행하세요.", "DB_SCHEMA_MISSING");
      case "ECONNREFUSED":
      case "PROTOCOL_CONNECTION_LOST":
        return createHttpError(503, "DB 연결에 실패했습니다. DB 설정과 실행 상태를 확인하세요.", "DB_CONNECTION_FAILED");
      default:
        return createHttpError(500, error.message || "DB 처리 중 오류가 발생했습니다.", "DATABASE_ERROR");
    }
  };
}

module.exports = {
  createDatabaseErrorTranslator,
};
