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
      <button onClick={handleOpenPopup}>방 입장</button>
      <button onClick={handleOpenPopup}>방 생성</button>

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
