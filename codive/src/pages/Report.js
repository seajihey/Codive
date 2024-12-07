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
    { problem: "두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.", correctAnswer: "55" },
    { problem: "세 정수 A, B, C를 입력받고, 그 중 가장 큰 값을 출력하는 프로그램을 작성하시오.", correctAnswer: "280" },
    { problem: "정수 N이 주어질 때, 1부터 N까지의 합을 구하는 프로그램을 작성하시오.", correctAnswer: "5" },
    { problem: "문자열 S가 주어졌을 때, S의 길이를 출력하는 프로그램을 작성하시오.", correctAnswer: "5" },
    { problem: "부분 집합 생성하기", correctAnswer: "부분 집합 출력 결과" }
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
    const fetchData = async () => {
      if (!roomCode || !currentUser) return;  
      if (!loading) return; 
      setLoading(true); 
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

        const analysisResults = [];
        for (const [index, answer] of filteredAnswers.entries()) {
          try {
            const escapedCode = escapeCode(answer.content);
            
            // 코드 실행 및 결과 가져오기
            const executionResponse = await fetch(`http://localhost:8000/execute-code/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                code: escapedCode,
              })
            });

            const executionResult = await executionResponse.json();
            const expectedAnswer = problems[index + 1]?.correctAnswer;
            const isTestPass = executionResult.stdout?.trim() == expectedAnswer ? "통과" : "미통과";

            // 시간 복잡도 및 코드 스타일 가져오기
            const gptResponse = await fetch(`http://localhost:8000/generate-text/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ 
                problem: problems[index + 1]?.problem,
                answer: escapedCode,
                max_tokens: 100
              })
            });

            const gptResult = await gptResponse.json();
            const { time_complexity, code_style } = JSON.parse(gptResult.generated_text);

            analysisResults.push({
              ...executionResult,
              test_pass: isTestPass,
              time_complexity,
              code_style
            });
          } catch (error) {
            analysisResults.push({
              test_pass: "미통과",
              time_complexity: "코드제출 x",
              code_style: "코드제출 x",
              execution_time: "코드제출x",
              memory_usage: "코드제출 x"
            });
          }
        }

        setCodeAnalysisResults(analysisResults);
        setLoading(false); 
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [roomCode, currentUser, loading]);

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      deleteSpecificCookie('elapsedTime');
    });
  }, []);

  const escapeCode = (code) => {
    console.log("Original Code:", code); 
    const escapedCode = code.replace(/    /g, '\t');  
    console.log("Escaped Code:", escapedCode); 
    return escapedCode;
  };

  const renderedCodeAnalysis = useMemo(() => {
    return codeAnalysisResults.map((result, index) => {
      const testCasePass = result.test_pass || 'N/A';
      const timeComplexity = result.time_complexity || 'N/A';
      const codeStyle = result.code_style || 'N/A';
  
      let executionTime = result.execution_time ? result.execution_time.toFixed(2) : '코드실행 x';
      let memoryUsage = result.memory_usage ? result.memory_usage.toFixed(2) : '코드실행 x'; 
  
      if (!result.stdout || result.stdout.trim() === '') {
        executionTime = '코드실행 x';
        memoryUsage = '코드실행 x';
      }
  
      return (
        <div className="lineWrapper" key={index}>
          <div className="num">#{index + 1}</div>
          <div className="line">
            <div className="timeComplex">{timeComplexity}</div>
            <div className="codeStyle">{codeStyle}</div>
            <div className="memoryUse">{memoryUsage} KB</div>
            <div className="playTime">{executionTime} ms</div> 
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
