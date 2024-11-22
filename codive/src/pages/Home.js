import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../Home.css';

function Home() {
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState('join');
  
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [passwordMatch, setPasswordMatch] = useState(true);
  const [allowErrorLocation, setAllowErrorLocation] = useState(false); 
  const [allowAICodeRecommendation, setAllowAICodeRecommendation] = useState(false);
  
  const [inviteCodeErrorMessage, setInviteCodeErrorMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  
  const navigate = useNavigate();

  const handleOpenPopup = (type) => {
    setShowPopup(true);
    setPopupType(type);
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
    const body = JSON.stringify({ codeID: inviteCode, pw: password, user_id: '사용자_아이디' });  // 사용자 ID 추가
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log("Error Data:", errorData); // 디버깅을 위해 콘솔에 오류 데이터를 출력
        handleError(response.status, errorData);
      } else {
        const data = await response.json();
        if (popupType === 'create') {
          console.log(data);
          setPopupType('room-options');
        } else {
          navigate('/room');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setInviteCodeErrorMessage("서버 오류가 발생했습니다.");
      setPasswordErrorMessage("서버 오류가 발생했습니다.");
    }
  };     
  
  // Updated error handling for invite code duplication in create room
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
        message = errorData.detail || "중복된 코드입니다.";
        setInviteCodeErrorMessage(message);
        setPasswordErrorMessage('');
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
            <OptionField label="오류위치 제공 허용" checked={allowErrorLocation} setChecked={setAllowErrorLocation} />
            <OptionField label="AI코드 추천 허용" checked={allowAICodeRecommendation} setChecked={setAllowAICodeRecommendation} />
            <button className="popup-create-button" onClick={() => { navigate('/room'); handleClosePopup(); }} style={{ backgroundColor: '#3100AE' }}>생성</button>
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
          코디브(Codive)는 실시간으로 함께 코딩문제를 풉니다. <br />
          AI가 제공하는 실시간 피드백과 문제를 푼 뒤 제공되는 평가보고서를 통해 약점을 보완하세요.
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
      id={label} // 유일한 ID를 부여합니다
    />
    <label htmlFor={label} className="custom-checkbox-label"></label> 
    <label htmlFor={label}>{label}</label> 
  </div>
);

export default Home;
