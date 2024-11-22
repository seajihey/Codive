import React, { useEffect, useState, useMemo } from 'react';
import '../Report.css';
import { FaCrown } from "react-icons/fa";
import { IoHome } from "react-icons/io5";
import { BsFillSave2Fill } from "react-icons/bs";

const Report = React.memo(() => {
  const [userAnswers, setUserAnswers] = useState([]);
  const [guestCount, setGuestCount] = useState(1);
  const [codeAnalysisResults, setCodeAnalysisResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const roomCode = "abd";
  const currentUser = "abd-1";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [guestResponse, answersResponse] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/room/${roomCode}/guests`),
          fetch(`http://127.0.0.1:8000/api/answers/`)
        ]);

        if (!guestResponse.ok || !answersResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const guestData = await guestResponse.json();
        setGuestCount(guestData.length);

        const answersData = await answersResponse.json();
        const filteredAnswers = answersData.filter(answer => answer.user_id === currentUser);
        setUserAnswers(filteredAnswers);

        const questionIds = filteredAnswers.map(answer => answer.question_id);

        const questionResponse = await fetch(`http://127.0.0.1:8000/api/questions/all/`);
        if (!questionResponse.ok) {
          throw new Error('Failed to fetch questions');
        }
        const questionsData = await questionResponse.json();
        const relevantQuestions = questionsData.filter(question => questionIds.includes(question.id));

        const analysisResults = await Promise.all(relevantQuestions.map(async (question) => {
          const answer = filteredAnswers.find(ans => ans.question_id === question.id);
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
          try {
            return JSON.parse(gptResponse.generated_text);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid JSON format');
          }
        }));

        setCodeAnalysisResults(analysisResults);
        setLoading(false); // 데이터 로딩 완료 후 로딩 상태 업데이트

      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false); // 오류 발생 시에도 로딩 상태 업데이트
      }
    };

    fetchData();
  }, [roomCode]); // roomCode가 변경될 때마다 데이터를 다시 가져옴

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
  }, [codeAnalysisResults]); // codeAnalysisResults가 변경될 때마다 렌더링

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
