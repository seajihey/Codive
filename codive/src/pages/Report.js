import React, { useEffect, useState, useMemo } from 'react';
import '../Report.css';
import { FaCrown } from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { BsFillSave2Fill } from "react-icons/bs";

const getCookieValue = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const deleteSpecificCookie = (name) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
};

const Report = React.memo(() => {
  const [userAnswers, setUserAnswers] = useState([]);
  const [codeAnalysisResults, setCodeAnalysisResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setWhoUser] = useState("");
  const [rank, setRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roomCode, setRoomCode] = useState("");
  
  const problems = [
    "",
    "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.",
    "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.",
    "정수 N이 주어질 때, 1부터 N까지의 합을 구하는 프로그램을 작성하시오.",
    "문자열 S가 주어졌을 때, S의 길이를 출력하는 프로그램을 작성하시오.",
    "두 정수 A와 B가 주어졌을 때, A와 B를 곱한 값을 출력하는 프로그램을 작성하시오."
  ];

  useEffect(() => {
    if (!sessionStorage.getItem('reloaded')) {
      sessionStorage.setItem('reloaded', 'true');
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    setUserAnswers([]);
    setCodeAnalysisResults([]);
    setLoading(true);
    const guestId = getCookieValue('guest_id');
    setWhoUser(guestId);
    if (guestId) {
      const roomId = guestId.split('-')[0];
      setRoomCode(roomId);
    }
  }, []);

  useEffect(() => {
    if (!window.location.search.includes('reloaded=true')) {
      const newUrl = window.location.href.includes('?')
        ? `${window.location.href}&reloaded=true`
        : `${window.location.href}?reloaded=true`;
      window.location.replace(newUrl);
    }
  }, []);

  useEffect(() => {
    const fetchRank = async () => {
      if (!roomCode || !currentUser) return;
      try {
        const response = await fetch(`/api/room/${roomCode}/user_stats`);
        if (!response.ok) {
          throw new Error('Failed to fetch rank');
        }
        const data = await response.json();
        setRank(data.total_users - data.active_users);
        setTotalUsers(data.total_users);
      } catch (error) {
        console.error('Error fetching rank:', error);
      }
    };

    fetchRank();
  }, [roomCode, currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      if (!roomCode) return;
      try {
        const [answersResponse, guestCountResponse] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/answers/`),
          fetch(`http://127.0.0.1:8000/api/room/${roomCode}/guestcount`)
        ]);
  
        if (!answersResponse.ok || !guestCountResponse.ok) {
          throw new Error('Failed to fetch data');
        }
  
        const guestCountData = await guestCountResponse.json();
        setTotalUsers(guestCountData.guest_count);
  
        const answersData = await answersResponse.json();
        const filteredAnswers = answersData.filter(answer => answer.user_id === currentUser);
        setUserAnswers(filteredAnswers);
  
        const questionIds = filteredAnswers.map(answer => answer.question_id);
        console.log("Question IDs:", questionIds);
  
        const relevantQuestions = questionIds.map(id => ({
          id,
          content: problems[id]
        }));
  
        console.log("Relevant Questions:", relevantQuestions);
  
        const analysisResults = await Promise.all(relevantQuestions.map(async (question) => {
          const answer = filteredAnswers.find(ans => ans.question_id === question.id);
          try {
            const response = await fetch(`http://127.0.0.1:8000/generate-text/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                problem: question.content,
                answer: answer.content,
                max_tokens: 150
              })
            });

            const gptResponse = await response.json();
            console.log("GPT Response:", gptResponse);

            const correctedJSON = gptResponse.generated_text.replace(/'/g, '"');
            return JSON.parse(correctedJSON);
          } catch (error) {
            console.error('JSON parse error or fetch error:', error);
            // 기본값 반환
            return {
              test_pass: "통과x",
              time_complexity: "코드제출 x",
              code_style: "코드제출 x",
              execution_time: "코드제출x",
              memory_usage: "코드제출 x"
            };
          }
        }));
  
        setCodeAnalysisResults(analysisResults);
        setLoading(false);
  
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
  
    fetchData();
  }, [roomCode, currentUser]);
  

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      deleteSpecificCookie('elapsedTime');
    });
  }, []);

  const renderedCodeAnalysis = useMemo(() => {
    return codeAnalysisResults.map((result, index) => {
      const testCasePass = result.test_pass || 'N/A';
      const timeComplexity = result.time_complexity || 'N/A';
      const codeStyle = result.code_style || 'N/A';
      const executionTime = result.execution_time || 'N/A';
      const memoryUsage = result.memory_usage || 'N/A';

      return (
        <div className="lineWrapper" key={index}>
          <div className="num">#{index + 1}</div>
          <div className="line">
            <div className="timeComplex">{timeComplexity}</div>
            <div className="codeStyle">{codeStyle}</div>
            <div className="memoryUse">{memoryUsage}</div>
            <div className="playTime">{executionTime}</div>
            <div className="testCase">{testCasePass}</div>
          </div>
        </div>
      );
    });
  }, [codeAnalysisResults]);

  return (
    <div className="report">
      <div className="backText">
        <div className="backtext1">
          <div className="TextBallon">나는 몇번째로 문제를 다 풀었을까?...</div>
          <div className="TextBold">
            {rank !== null && totalUsers !== null ? (
              <div>{totalUsers}명 중 {rank}등!</div>
            ) : (
              <div>순위를 불러오는 중...</div>
            )}
          </div>
          <div className="TextSemi">
            아래에 당신이 푼 코드의 분석이 있습니다.<br />
            시간복잡도, 코드 스타일, 테스트케이스 통과여부, 메모리 사용량 등의 분석을 한 눈에 확인하세요.<br />
            새로고침 시, 정보가 초기화 되니 조심하세요.
          </div>
          <div className="crown"><FaCrown size="150px" color="#F6D903" /></div>
        </div>
      </div>
      <div className='contentBox'>
        <div className="contentWrap">
          <div className="titles">
            <div className="titleBox">시간복잡도</div>
            <div className="titleBox codeBox">코드스타일</div>
            <div className="titleBox">메모리 사용량</div>
            <div className="titleBox">실행 시간</div>
            <div className="titleBox">테스트 케이스</div>
          </div>
          {loading ? <div>문서 생성 중 ...</div> : renderedCodeAnalysis}
        </div>
      </div>

      <div className='savAndMainBtn'>
        <div className='mainBtn'>
          <div className='btnText'>메인화면</div>
          <div className='btnIcon'><IoHome size="20px" /></div>
        </div>
        <div className='saveBtn'>
          <div className='btnText'>보고서 저장</div>
          <div className='btnIcon'><BsFillSave2Fill size="20px" /></div>
        </div>
      </div>
    </div>
  );
});

export default Report;
