import React, { useEffect, useState } from 'react';
import '../Report.css';

import { FaCrown } from "react-icons/fa";
import { LuCat } from "react-icons/lu";
import { IoHome } from "react-icons/io5";
import { BsFillSave2Fill } from "react-icons/bs";

function Report() {
  const [userAnswers, setUserAnswers] = useState([]);
  const [guestCount, setGuestCount] = useState(0);
  const roomCode = "abd"; 

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/room/${roomCode}/guests`)
      .then(response => response.json())
      .then(lengthData => {
        setGuestCount(lengthData.length); 
      })
      .catch(error => {
        console.error('게스트를 가져오는 중 오류 발생:', error);
      });

    fetch(`http://127.0.0.1:8000/api/answers/`)
      .then(response => response.json())
      .then(data => {
        const promises = data
          .filter(answer => answer.user_id === "abd-1")
          .map(answer => {
            return fetch(`http://127.0.0.1:8000/api/analyze-code/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ code: answer.content })
            })
              .then(response => response.json())
              .then(result => {
                const codeStyleArray = result.result ? result.result.split('\n') : [];
                return {
                  question_id: answer.question_id,
                  content: answer.content,
                  codeStyle: codeStyleArray
                };
              });
          });

        Promise.all(promises).then(setUserAnswers);
      })
      .catch(error => {
        console.error('답변을 가져오는 중 오류 발생:', error);
      });
  }, [roomCode]);

  return (
    <div className="report">
      <div className="backText">
        <div className="backtext1">
          <div className="TextBallon">내 순위는?</div>
          <div className="TextBold">{guestCount}명 중 1등 !</div>
          <div className="TextSemi">
            아래에 당신이 푼 코드의 분석이 있습니다.<br />
            시간복잡도, 코드 스타일, 테스트케이스 통과여부, 메모리 사용량 등의 분석을 한 눈에 확인하세요.<br />
          </div>
          <div className="crown"><FaCrown size="150px" color="#F6D903" /></div>
        </div>
      </div>
      <div className='contentBox'>
        <div className="contentWrap">
          <div className="titles">
            <div className="titleBox">시간복잡도</div>
            <div className="titleBox codeBox">코드스타일</div>
            <div className="titleBox">메모리사용량</div>
            <div className="titleBox">실행시간</div>
          </div>
          {userAnswers.map((answer, index) => (
            <div className="lineWrapper" key={index}>
              <div className="num">#{index + 1}</div>
              <div className="line">
                <div className="timeComplex">O(n)</div>
                <div className="codeStyle">
                  {(answer.codeStyle || []).map((line, lineIndex) => (
                    <div key={lineIndex}>{line}</div>
                  ))}
                </div>
                <div className="memoryUse">74.2MB</div>
                <div className="playTime">0.456789 seconds</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='savAndMainBtn'>
        <div className='mainBtn'>
          <div className='btnText'>메인화면</div>
          <div className='btnIcon'><IoHome size="20px"/></div>
        </div>
        <div className='saveBtn'>
          <div className='btnText'>보고서 저장</div>
          <div className='btnIcon'><BsFillSave2Fill size="20px"/></div>
        </div>
      </div>
    </div>
  );
}

export default Report;
