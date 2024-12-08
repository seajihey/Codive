import React, { useState, useEffect } from 'react';
import '../Room.css';
import { useNavigate } from 'react-router-dom';
import { FaRobot, FaRegCheckCircle } from 'react-icons/fa';
import { Editor } from '@monaco-editor/react';

const getCookieValue = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

function Room({ allowAICodeRecommendation }) {
  const [code, setCode] = useState(''); 
  const [showAIBox, setShowAIBox] = useState(false);
  const [currentProblem, setCurrentProblem] = useState(1);
  const navigate = useNavigate();
  const [aiResponse, setAIResponse] = useState(""); 
  const [whouser, setWhoUser] = useState("");
  const problems = [
    "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
    "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.",
    "정수 N이 주어질 때, 1부터 N까지의 합을 구하는 프로그램을 작성하시오.",
    "문자열 S가 주어졌을 때, S의 길이를 출력하는 프로그램을 작성하시오.",
    "두 정수 A와 B가 주어졌을 때, A와 B를 곱한 값을 출력하는 프로그램을 작성하시오."
  ];

  useEffect(() => {
    const guestId = getCookieValue('guest_id');
    console.log(guestId);
    setWhoUser(guestId);
  }, []);

  const sendCodeToBackend = async () => {
     {
      const payload = {
        content: code, 
        question_id: currentProblem, 
        user_id: whouser, 
      };

      const response = await fetch('https://codive-backend.onrender.com/api/answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Server Response:', result);
      } 
  };  }

  const finishUserSession = async () => {
    try {
      const response = await fetch(`https://codive-backend.onrender.com/api/user/finish/${whouser}`, {
        method: 'PATCH', 
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update user session');
      }
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  };


  const nextProblem = () => {
    sendCodeToBackend();
    if (currentProblem < 5) {
      setAIResponse("AI 응답을 기다리는 중");
      setShowAIBox(false);
      setCurrentProblem(currentProblem + 1);
      setCode('// 코드를 입력하세요');  
    } else {
      finishUserSession().then(() => {
        alert('코드가 성공적으로 제출되었습니다.');
        navigate('/report');
      }).catch((error) => {
        console.error('Error finishing user session:', error);
      });

    }
  };
  const handleEditorChange = (value) => {
    setCode(value);
  };

  const formatCode = (rawCode) => {
    let formattedCode = rawCode.replace(/\t/g, "    ");
    formattedCode = formattedCode.trim();
    formattedCode = formattedCode.replace(/\n\s*\n/g, "\n");
    return formattedCode;
  };

  const handleAIButtonClick = async () => {
    if (!allowAICodeRecommendation) return;

    setShowAIBox((prevState) => !prevState); 
  
    if (!showAIBox) { 
      const formattedCode = formatCode(code); 
      const currentProblemStatement = problems[currentProblem - 1]; 
  
      const payload = {
        user_code: formattedCode,
        problem_statement: currentProblemStatement, 
        max_tokens: 100,
      };
  
      try {
        const response = await fetch("/generate-hint/", {
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
        <FaRobot className="icon" /> {showAIBox ? 'AI가 멘트를 추천하는 중':'AI가 추천하는 멘트 보기'}
      </button>

      <button className="nextButton" onClick={nextProblem}>
        {currentProblem < 5 ? '다음' : '제출'}
      </button>

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
