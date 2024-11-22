import React, { useState } from 'react';
import '../Room.css';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaRegCheckCircle } from 'react-icons/fa';
import { Editor } from '@monaco-editor/react';

function Room({ allowAICodeRecommendation }) {
  const [code, setCode] = useState('');  // 입력된 파이썬 코드 상태
  const [showAIBox, setShowAIBox] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(1);
  const navigate = useNavigate();
  const [aiResponse, setAIResponse] = useState(""); // AI 응답 저장

  // 문제 목록
  const problems = [
    "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
    "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.",
    "정수 N이 주어질 때, 1부터 N까지의 합을 구하는 프로그램을 작성하시오.",
    "문자열 S가 주어졌을 때, S의 길이를 출력하는 프로그램을 작성하시오.",
    "두 정수 A와 B가 주어졌을 때, A와 B를 곱한 값을 출력하는 프로그램을 작성하시오."
  ];

  // 백엔드로 코드 전송
  const sendCodeToBackend = async () => {
    try {
      // 서버 요구 사항에 맞는 데이터를 생성
      const payload = {
        content: code, // 작성된 코드
        question_id: currentProblem, // 문제 번호 (정수)
        user_id: "user123", // 사용자 ID (문자열)
      };
  
      console.log("Sending Payload:", payload); // 디버깅용 로그
  
      const response = await fetch('http://localhost:8000/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // JSON 형태로 변환
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log('Server Response:', result);
        alert('코드가 성공적으로 제출되었습니다.');
      } else {
        console.error('Error submitting code:', response.statusText);
        alert('코드 제출 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('네트워크 오류가 발생했습니다.');
    }
  };  

  const nextProblem = () => {
    if (currentProblem < 5) {
      setShowAIBox(false);
      setCurrentProblem(currentProblem + 1);
      setCode('// 코드를 입력하세요');  // 상태를 디폴트 값으로 초기화
    } else {
      sendCodeToBackend();
      navigate('/report');
    }
  };

  // Editor 값 변경 핸들러
  const handleEditorChange = (value) => {
    setCode(value);
  };

  // 코드 형식 정리 함수
  const formatCode = (rawCode) => {
    // 탭을 스페이스 4칸으로 변환
    let formattedCode = rawCode.replace(/\t/g, "    ");
    // 불필요한 공백 제거 (양끝 트림)
    formattedCode = formattedCode.trim();
    // 여러 줄바꿈을 하나로 통합
    formattedCode = formattedCode.replace(/\n\s*\n/g, "\n");
    return formattedCode;
  };

  const handleAIButtonClick = async () => {
    if (!allowAICodeRecommendation) return;

    setShowAIBox((prevState) => !prevState); // Toggle showAIBox
  
    if (!showAIBox) { // If AI box is closed, request data
      const formattedCode = formatCode(code); // Format the code
      const currentProblemStatement = problems[currentProblem - 1]; // Get the current problem statement
  
      const payload = {
        user_code: formattedCode,
        problem_statement: currentProblemStatement, // Include the problem statement
        max_tokens: 100,  // Set the max_tokens as defined by server
      };
  
      try {
        const response = await fetch("http://localhost:8000/generate-hint/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
  
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
  
        const data = await response.json();
        console.log(data);
        setAIResponse(data.content || "AI로부터 응답을 받을 수 없습니다. 다시 시도해");
      } catch (error) {
        console.error("AI 요청 중 오류 발생:", error);
        setAIResponse("AI로부터 응답을 받을 수 없습니다. 다시 시도해주세요.");
      }
    }
  };

  return (
    <div className="room-container">
      <h2 className="number"># 0{currentProblem}번 |</h2>
      <p className="problem">{problems[currentProblem - 1]}</p>

      <div className="codeContainer">
        <Editor
          className="codeEditor"
          height="50vh"
          defaultLanguage="python"
          defaultValue="// 코드를 입력하세요"
          value={code}
          onChange={handleEditorChange}
          options={{
            fontSize: 15,
            minimap: { enabled: false },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            }
          }}
        />
      </div>

      <label className="errorButton">
        {<FaRegCheckCircle className="icon" />}
        오류 위치 표시되는 중
      </label>

      <button className="aiButton" onClick={handleAIButtonClick} disabled={!allowAICodeRecommendation}>
        <FaRobot className="icon" /> {showAIBox == true ? 'AI가 멘트를 추천하는 중':'AI가 추천하는 멘트 보기'}
      </button>

      <button className="nextButton" onClick={nextProblem}>
        {currentProblem < 5 ? '다음' : '제출'}
      </button>

     {/* AI 추천 멘트 표시 */}
     {showAIBox && (
        <div>
          <p className="aiBoxTitle">AI 멘트 추천</p>
          <div className="ai-box">
            <p>{aiResponse || "AI가 추천하는 멘트가 여기에 나타납니다."}</p>
            <div className="scrollable-content"></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Room;