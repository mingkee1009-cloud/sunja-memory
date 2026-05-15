export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif"
      }}
    >
      <div
        style={{
          padding: "40px",
          borderRadius: "20px",
          background: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          textAlign: "center"
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            marginBottom: "16px"
          }}
        >
          기억창고 정상 배포 성공
        </h1>

        <p
          style={{
            color: "#666",
            fontSize: "16px"
          }}
        >
          Next.js + Vercel 연결 완료
        </p>
      </div>
    </main>
  );
}