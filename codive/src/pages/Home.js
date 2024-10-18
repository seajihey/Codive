import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Home.css';


function Home() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('join'); // Default popup type is "join"
  
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [allowErrorLocation, setAllowErrorLocation] = useState(false); // Option for "오류위치 제공 허용"
  const [allowAICodeRecommendation, setAllowAICodeRecommendation] = useState(false); // Option for "AI코드 추천 허용"

  const navigate = useNavigate();

  const handleOpenPopup = (type) => {
    setShowPopup(true);
    setPopupType(type); // Set popup type based on button clicked
    resetForm();
  };

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  const resetForm = () => {
    setInviteCode('');
    setPassword('');
    setConfirmPassword('');
    setPasswordMatch(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (popupType === 'create' && password !== confirmPassword) {
      setPasswordMatch(false);
      return;
    }

    if (popupType === 'create') {
      setPopupType('room-options');
    } else {
      navigate('/room');
    }
  };

  const isInputFilled = () => {
    return inviteCode.trim() !== '' && password.trim() !== '';
  };

  const getPasswordInputClass = () => {
    if (!passwordMatch && popupType === 'create') {
      return 'error';
    }
    return '';
  };

  return (   

    <div className="home-container">
      
      {/* 로고 */}
      <header className="header">
        <div className="logo">코디브<br />logo</div>
      </header>

      <main className="main-content">
        <h1 className="main-title">Get Start Online Coding<br /> With your friends</h1>
        <p className="description">
          코디브(Codive)는 실시간으로 함께 코딩문제를 풉니다. <br />
          AI가 제공하는 실시간 피드백과 문제를 푼 뒤 제공되는 평가보고서를 통해 약점을 보완하세요.
        </p>
        <div className="button-container">
          <button
            className="button"
            onClick={() => handleOpenPopup('create')}
          >
            그룹 생성
          </button>
          <button
            className="button"
            onClick={() => handleOpenPopup('join')}
          >
            그룹 참가
          </button>
        </div>
      </main>

      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            {popupType === 'create' && (
              <div>
                <h2>그룹 생성</h2>
                <p>새로운 그룹을 생성해보세요. <br /> 중복된 코드는 생성 불가합니다.</p>
                <form onSubmit={handleSubmit}>
                  <div className="input-container">
                    <label>그룹 초대코드</label>
                    <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                    <p className="error-message">중복된 코드입니다.</p>
                  </div>
                  <div className="input-container">
                    <label>그룹 비밀번호</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className={`input-container ${getPasswordInputClass()}`}>
                    <label>그룹 비밀번호 재확인</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    {!passwordMatch && <p className="error-message">비밀번호가 일치하지 않습니다.</p>}
                  </div>
                  <button 
                    className="popup-button" 
                    onClick={handleSubmit} 
                    style={{ backgroundColor: isInputFilled() ? '#3100AE' : '#B5B5B5' }}
                    disabled={!isInputFilled()}
                  >
                    다음
                  </button>
                </form>
              </div>
            )}

            {popupType === 'join' && (
              <div>
                <h2>그룹 참가</h2>
                <p><br />생성된 그룹에 참여하세요.</p>
                <div className="input-container">
                  <label><br /><br/>그룹 초대코드</label>
                  <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                </div>
                <div className="input-container">
                  <label>그룹 비밀번호</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <button 
                  className="popup-button" 
                  onClick={handleSubmit} 
                  style={{ backgroundColor: isInputFilled() ? '#3100AE' : '#B5B5B5' }}
                  disabled={!isInputFilled()}
                >
                  다음
                </button>
              </div>
            )}

            {popupType === 'room-options' && (
              <div>
                <h2>그룹 생성</h2>
                <p><br />그룹의 설정을 마무리 하세요.</p>
                                
                <div className="option-container">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    id="errorLocation"
                    checked={allowErrorLocation}
                    onChange={() => setAllowErrorLocation(!allowErrorLocation)}
                  />
                  <label htmlFor="errorLocation" className="custom-checkbox-label"></label>
                  <label htmlFor="errorLocation">오류위치 제공 허용</label>
                </div>

                <div className="option-container">
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    id="aiCodeRecommendation"
                    checked={allowAICodeRecommendation}
                    onChange={() => setAllowAICodeRecommendation(!allowAICodeRecommendation)}
                  />
                  <label htmlFor="aiCodeRecommendation" className="custom-checkbox-label"></label>
                  <label htmlFor="aiCodeRecommendation">AI코드 추천 허용</label>
                </div>

                {/* Always enabled "생성" button with active color */}
                <button 
                  className="popup-button" 
                  onClick={() => { 
                    // Navigate to room after selecting options
                    navigate('/room'); 
                    handleClosePopup();
                  }}
                  style={{ backgroundColor: '#3100AE' }}
                >
                  생성
                </button>
              </div>
            )}

            <button className="close-btn" onClick={handleClosePopup}>
              ×</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
