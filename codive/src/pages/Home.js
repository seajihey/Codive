import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Home.css';
import "../waiting.css";

function Home() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('join');
  const [showWaitingPopup, setShowWaitingPopup] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [allowTimeLimit, setAllowTimeLimit] = useState(false);
  const [allowAICodeRecommendation, setAllowAICodeRecommendation] = useState(false);

  const [inviteCodeErrorMessage, setInviteCodeErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');

  const [nowPerson, setNowPerson] = useState(1);

  const navigate = useNavigate();
  const socketRef = useRef(null);

useEffect(() => {
  if (showWaitingPopup) {
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/${inviteCode}`);

    socketRef.current.onmessage = (event) => {
      if (event.data.includes("started")) {
        navigate('/room');
      } else if (event.data.startsWith("count:")) {
        const count = parseInt(event.data.split(":")[1], 10);
        setNowPerson(count);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }
}, [showWaitingPopup, inviteCode, navigate]);

  const handleOpenPopup = (type) => {
    setShowPopup(true);
    setPopupType(type);
    resetForm();
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setShowWaitingPopup(false);
    window.location.reload();
  };

  const resetForm = () => {
    setInviteCode('');
    setPassword('');
    setConfirmPassword('');
    setPasswordMatch(true);
    clearErrorMessages();
  };

  const clearErrorMessages = () => {
    setInviteCodeErrorMessage('');
    setPasswordErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (popupType === 'create' && password !== confirmPassword) {
      setPasswordMatch(false);
      return;
    }

    const endpoint = popupType === 'create' ? '/api/room_create' : '/api/room/enter';
    const body = JSON.stringify({ codeID: inviteCode, pw: password });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        handleError(response.status, errorData);
      } else {
        if (popupType === 'create') {
          setPopupType('room-options');
        } else {
          setShowWaitingPopup(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setInviteCodeErrorMessage("서버 오류가 발생했습니다.");
      setPasswordErrorMessage("서버 오류가 발생했습니다.");
    }
  };

  const handleStartRoom = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send("start");
    }
  };

  const handleError = (status, errorData) => {
    let message;

    switch (status) {
      case 404:
        message = errorData.detail || "올바르지 않은 초대 코드입니다.";
        setInviteCodeErrorMessage(message);
        setPasswordErrorMessage('');
        break;
      case 403:
        message = errorData.detail || "비밀번호가 일치하지 않습니다.";
        setPasswordErrorMessage(message);
        setInviteCodeErrorMessage('');
        break;
      case 400:
        if (errorData.detail === "이미 시작된 방입니다.") {
          setInviteCodeErrorMessage(errorData.detail);
          setPasswordErrorMessage('');
        } else {
          message = errorData.detail || "중복된 코드입니다.";
          setInviteCodeErrorMessage(message);
          setPasswordErrorMessage('');
        }
        break;
      default:
        message = "알 수 없는 오류가 발생했습니다.";
        setInviteCodeErrorMessage(message);
        setPasswordErrorMessage(message);
    }
  };

  const isInputFilled = () => inviteCode.trim() !== '' && password.trim() !== '';

  const getPasswordInputClass = () => !passwordMatch && popupType === 'create' ? 'error' : '';

  const renderPopupContent = () => {
    switch (popupType) {
      case 'create':
        return (
          <>
            <h2>그룹 생성</h2>
            <p>새로운 그룹을 생성해보세요. <br /> 중복된 코드는 생성 불가합니다.</p>
            <form onSubmit={handleSubmit}>
              <InputField label="그룹 초대코드" value={inviteCode} setValue={setInviteCode} errorMessage={inviteCodeErrorMessage} />
              <InputField label="그룹 비밀번호" type="password" value={password} setValue={setPassword} />
              <InputField label="그룹 비밀번호 재확인" type="password" value={confirmPassword} setValue={setConfirmPassword} errorMessage={!passwordMatch ? "비밀번호가 일치하지 않습니다." : ''} errorClass={getPasswordInputClass()} />
              <SubmitButton isFilled={isInputFilled()} />
            </form>
          </>
        );
      case 'join':
        return (
          <>
            <h2>그룹 참가</h2>
            <p><br />생성된 그룹에 참여하세요.</p>
            <form onSubmit={handleSubmit}>
              <InputField label="그룹 초대코드" value={inviteCode} setValue={setInviteCode} errorMessage={inviteCodeErrorMessage} />
              <InputField label="그룹 비밀번호" type="password" value={password} setValue={setPassword} errorMessage={passwordErrorMessage} />
              <SubmitButton isFilled={isInputFilled()} />
            </form>
          </>
        );
      case 'room-options':
        return (
          <>
            <h2>그룹 생성</h2>
            <p><br />그룹의 설정을 마무리 하세요.</p>
            <OptionField label="제한 시간 설정" checked={allowTimeLimit} setChecked={setAllowTimeLimit} />
            <OptionField label="AI 힌트 허용" checked={allowAICodeRecommendation} setChecked={setAllowAICodeRecommendation} />
            <button className="popup-create-button" onClick={handleStartRoom} style={{ backgroundColor: '#3100AE' }}>시작하기</button>
            <button className="popup-create-button" onClick={() => setShowWaitingPopup(true)} style={{ backgroundColor: '#3100AE' }}>생성</button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">Codive</div>
      </header>

      <main className="main-content">
        <h1 className="main-title">Get Start Online Coding<br /> With your friends</h1>
        <p className="description">
          코디브(Codive)는 실시간으로 함께 코딩문제를 풀 수 있는 플랫폼입니다. <br />
          AI가 제공하는 맞춤형 힌트를 통해 문제를 해결하고, 코드 평가 보고서로 약점을 보완하세요.
        </p>
        <div className="button-container">
          <button className="button" onClick={() => handleOpenPopup('create')}>그룹 생성</button>
          <button className="button" onClick={() => handleOpenPopup('join')}>그룹 참가</button>
        </div>
      </main>

      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            {renderPopupContent()}
            <button className="close-btn" onClick={handleClosePopup}>×</button>
          </div>
        </div>
      )}

      {showWaitingPopup && (
        <WaitingPopup
          nowPerson={nowPerson}
          onClose={handleClosePopup}
          onStartRoom={popupType === 'room-options' ? handleStartRoom : undefined}
        />
      )}
    </div>
  );
}

const InputField = ({ label, type = 'text', value, setValue, errorMessage = '', errorClass = '' }) => (
  <div className={`input-container ${errorClass}`}>
    <label>{label}</label>
    <input type={type} value={value} onChange={(e) => setValue(e.target.value)} />
    {errorMessage && <p className="error-message">{errorMessage}</p>}
  </div>
);

const SubmitButton = ({ isFilled }) => (
  <button className="popup-button" style={{ backgroundColor: isFilled ? '#3100AE' : '#B5B5B5' }} disabled={!isFilled}>다음</button>
);

const OptionField = ({ label, checked, setChecked }) => (
  <div className="option-container">
    <input
      type="checkbox"
      className="custom-checkbox"
      checked={checked}
      onChange={() => setChecked(!checked)}
      id={label}
    />
    <label htmlFor={label} className="custom-checkbox-label"></label>
    <label htmlFor={label}>{label}</label>
  </div>
);

const WaitingPopup = ({ nowPerson, onClose, onStartRoom }) => (
  <div className="waiting-popup">
    <div className="waiting-popup-inner">
      <p>사람을 모으는 중입니다. 방장은 시작하기를 눌러 시작할 수 있습니다. <br /><br />현재 인원: {nowPerson}명</p>
      {onStartRoom ? (
        <button className="start-btn" onClick={onStartRoom}>시작하기</button>
      ) : null}
      <button className="closeddbtn" onClick={onClose}>취소하기</button>
    </div>
  </div>
);

export default Home;
