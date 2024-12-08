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
  const [currentUser, setCurrentUser] = useState("");  // renamed to `currentUser` for clarity
  const [rank, setRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roomCode, setRoomCode] = useState("");

  const problems = [
    "",
    { problem: "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.", correctAnswer: "55", testCases: ["30\n25"] },
    { problem: "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.", correctAnswer: "280", testCases: ["100\n200\n280"] },
    { problem: "두 값을 입력받고, 첫 번째 값을 두 번째 값으로 나눈 몫을 출력하는 프로그램을 작성하시오.", correctAnswer: "3", testCases: ["10\n3"] },
    { problem: "리스트를 입력받고, 그 중 짝수의 개수를 출력하는 프로그램을 작성하시오.", correctAnswer: "2", testCases: ["1 2 3 4 5"] },
  ];

  useEffect(() => {
    const guestId = getCookieValue('guest_id');
    setCurrentUser(guestId);
    if (guestId) {
      const roomId = guestId.split('-')[0];
      setRoomCode(roomId);
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
      if (!roomCode || !currentUser || !loading) return;
      setLoading(true);
      try {
        // Fetch answers and guest count concurrently
        const [answersResponse, guestCountResponse] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/answers/`),
          fetch(`http://127.0.0.1:8000/api/room/${roomCode}/guestcount`),
        ]);
  
        if (!answersResponse.ok || !guestCountResponse.ok) {
          throw new Error('Failed to fetch data');
        }
  
        const guestCountData = await guestCountResponse.json();
        setTotalUsers(guestCountData.guest_count);
  
        const answersData = await answersResponse.json();
        const filteredAnswers = answersData.filter(answer => answer.user_id === currentUser);
        setUserAnswers(filteredAnswers);
  
        // Process each answer and fetch code analysis
        for (let i = 0; i < filteredAnswers.length; i++) {
          const answer = filteredAnswers[i];
  
          try {
            const escapedCode = escapeCode(answer.content);
            console.log(escapedCode)
            console.log(answer.content)
            // Code execution and analysis
            const executionResponse = await fetch(`http://localhost:8000/execute-TimeAndResult`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                code: escapedCode,
                input_data: problems[i + 1]?.testCases.join("\n"),
              }),
            });
  
            const executionResult = await executionResponse.json();
            const expectedAnswer = problems[i + 1]?.correctAnswer;
            const isTestPass = executionResult.output?.trim() === expectedAnswer ? "통과" : "미통과";
            const isTime = executionResult.execution_time;
            const isMemo = executionResult.memory_used_kb;
  
            // Request for code analysis (time complexity, code style)
            const analysisResponse = await fetch("http://127.0.0.1:8000/generate-text/", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                problem: problems[i + 1]?.problem,
                answer: escapedCode,
                max_tokens: 200, // Adjust as needed
              }),
            });
  
            const analysisData = await analysisResponse.json();
            const analysis = analysisData.generated_text ? JSON.parse(analysisData.generated_text) : {
              time_complexity: "코드제출 x",
              code_style: "코드제출 x",
            };
  
            // Add the result to code analysis
            setCodeAnalysisResults((prevResults) => [
              ...prevResults,
              {
                test_pass: isTestPass,
                time_complexity: analysis.time_complexity,
                code_style: analysis.code_style,
                execution_time: isTime,
                memory_usage: isMemo,
              },
            ]);
          } catch (error) {
            setCodeAnalysisResults((prevResults) => [
              ...prevResults,
              {
                test_pass: "미통과",
                time_complexity: "코드제출 x",
                code_style: "코드제출 x",
                execution_time: "코드제출 x",
                memory_usage: "코드제출 x",
              },
            ]);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [roomCode, currentUser, loading]);
  
  const escapeCode = (code) => {
    return code.replace(/\\n/g, ';').replace(/    /g, "\t").trim();
  };
  const renderedCodeAnalysis = useMemo(() => {
    return codeAnalysisResults.map((result, index) => {
      // 객체가 아닌 값만 렌더링하도록 처리
      const testCasePass = result.test_pass || '코드제출x';
      const timeComplexity = result.time_complexity || '코드제출x';
      const codeStyle = result.code_style || '코드제출x';
      const memoryUsage = result.memory_usage || '코드제출x';
  
      // 문자열 변환 또는 속성 선택 (예: time_complexity가 객체일 경우)
      return (
        <div className="lineWrapper" key={index}>
          <div className="num">#{index + 1}</div>
          <div className="line">
            <div className="timeComplex">{timeComplexity}</div>
            <div className="codeStyle">{codeStyle}</div>
            <div className="memoryUse">{memoryUsage}</div>
            <div className="playTime">{result.execution_time}</div>
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
