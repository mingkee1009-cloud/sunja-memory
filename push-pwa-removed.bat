@echo off
chcp 65001 > nul
echo.
echo ============================================
echo  PWA 제거 - git push 실행
echo ============================================
echo.

cd /d "%~dp0"

REM index.lock 제거
if exist ".git\index.lock" (
    del /f ".git\index.lock"
    echo index.lock 제거 완료
)

REM git 사용자 설정
git config user.email "mingkee1009@gmail.com"
git config user.name "jenny"

REM 스테이징 + 커밋 (이미 커밋됐으면 nothing to commit 메시지 나오고 넘어감)
git add .
git commit -m "remove pwa completely for stable web app" 2>nul || echo (이미 커밋 완료)

REM push
echo.
echo git push 중...
git push

echo.
echo ============================================
echo  완료! Vercel 재배포가 시작됩니다.
echo  1~2분 후 시크릿 창으로 접속해서 확인하세요.
echo ============================================
echo.
pause
