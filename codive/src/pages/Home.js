import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Home.css';

function Home() {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleOpenPopup = () => {
    setShowPopup(true);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const handleSubmit = () => {
    navigate('/room');
  };

  return (
    <div className="home-container">
      {/*로고*/}
      <header className="header">
        <div className="logo">코디브<br />logo</div>
      </header>

      <main className="main-content">
        <h1 className = "main-title">Get Start Online Coding<br /> With your friends</h1>
        <p className="description">
          코디브(Codive)는 실시간으로 함께 코딩문제를 풉니다. <br />
          AI가 제공하는 실시간 피드백과 문제를 푼 뒤 제공되는 평가보고서를 통해 약점을 보완하세요.
        </p>
        <div className="button-container">
          <button className="button" onClick={handleOpenPopup}>그룹 생성</button>
          <button className="button" onClick={handleOpenPopup}>그룹 참가</button>
        </div>
      </main>

      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            <h2>팝업 내용</h2>
            {/* 팝업 내부의 내용 */}
            <button onClick={handleSubmit}>제출</button>
            <button onClick={handleClosePopup}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
