// src/pages/Room.js
import React, { useState, useEffect } from 'react';
import '../Room.css';  // CSS 파일 import
import { useNavigate } from 'react-router-dom';  // useNavigate import
import { FaDoorOpen, FaRobot, FaCircle, FaRegCircle } from 'react-icons/fa';  // 아이콘 import

function Room() {
  const [code, setCode] = useState('');  // 파이썬 코드 입력 상태
  const [lineCount, setLineCount] = useState(1);  // 줄 번호 상태
  const [showAIBox, setShowAIBox] = useState(false);  // AI 추천 박스 상태
  const [errorToggled, setErrorToggled] = useState(false);  // 오류 위치 토글 상태
  const [currentProblem, setCurrentProblem] = useState(1);  // 현재 문제 번호 (1~5)
  const navigate = useNavigate();  // useNavigate 훅 사용

  // 줄 번호 업데이트 함수
  useEffect(() => {
    setLineCount(code.split('\n').length);
  }, [code]);
  // 줄 번호 생성 함수
  const generateLineNumbers = () => {
    return Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  };

  // 문제 목록 (간단한 예시)
  const problems = [
    "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
    "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.",
    "정수 N이 주어질 때, 1부터 N까지의 합을 구하는 프로그램을 작성하시오.",
    "문자열 S가 주어졌을 때, S의 길이를 출력하는 프로그램을 작성하시오.",
    "두 정수 A와 B가 주어졌을 때, A와 B를 곱한 값을 출력하는 프로그램을 작성하시오."
  ];

  const toggleAIBox = () => {
    setShowAIBox(!showAIBox);
  };

  const toggleError = () => {
    setErrorToggled(!errorToggled);
  };

  const nextProblem = () => {
    if (currentProblem < 5) {
      setCurrentProblem(currentProblem + 1);
      setCode('');  // 다음 문제로 넘어갈 때 textarea 초기화
    } else {
      // 제출 로직 추가 가능
      navigate('/report');
    }
  };

  const exitRoom = () => {
    navigate('/home');  // Home.js로 이동
  };

  return (
    <div className="room-container">
      <div className="exitButtonContainer">
        <button className="exitButton" onClick={exitRoom}>
          <FaDoorOpen className="icon" /> 방 나가기
        </button>
      </div>
      
      {/* 번호 및 문제 */}
      <h2 className="number"># 0{currentProblem}번 |</h2> 
      <p className="problem">{problems[currentProblem - 1]}</p>
      
    <div className="codeContainer">
      <div className="lineNumbers">
        <pre>{generateLineNumbers()}</pre>
      </div>

      <textarea
        className="codeInput"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="파이썬 코드를 입력하세요."
        rows="20"
      />
    </div>
      
      {/* 오류 위치 표시 버튼*/}
      <button className="errorButton" onClick={toggleError}>
        {errorToggled ? <FaCircle className="icon" /> : <FaRegCircle className="icon" />}
        오류 위치 표시
      </button>

      {/* AI 코드 추천 버튼*/}
      <button className="aiButton" onClick={toggleAIBox}>
        <FaRobot className="icon" /> AI 코드 추천
      </button>

      {/* 문제 번호에 따른 버튼 텍스트 변경 */}
      <button className="nextButton" onClick={nextProblem}>
          {currentProblem < 5 ? '다음' : '제출'}
        </button>
      
      {/* AI 코드 추천 박스 (토글) */}
      {showAIBox && (
        <div>
          <p className="aiBoxTitle">AI Code 추천</p>
          <div className="ai-box">
            <p>AI가 추천하는 코드가 여기에 나타납니다.</p>
            <div className="scrollable-content">
              <p>AI 추천 코드</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Room;
