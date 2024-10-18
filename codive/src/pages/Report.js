import React, { useEffect, useRef, useState } from 'react';
import '../Report.css';

import { FaCrown } from "react-icons/fa";
import { LuCat } from "react-icons/lu";
import { IoHome } from "react-icons/io5";
import { BsFillSave2Fill } from "react-icons/bs";

function Report() {

  return (
    <div className="report">
        <div className="backText">
          <div class="backtext1">
            <div className="TextBallon">내 순위는?</div>
            <div className="TextBold">05명 중 1등 !</div>
            <div className="TextSemi">
              아래에 당신이 푼 코드의 분석이 있습니다.<br />
              시간복잡도, 코드 스타일, 테스트케이스 통과여부, 메모리 사용량 등의 분석을 한 눈에 확인하세요.<br />
              
            </div>
            <div class="crown"><FaCrown size="150px" color="#F6D903" /></div>
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

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>

          <div className="lineWrapper">
            <div className="num">#01</div>
            <div className="line">
              <div className="timeComplex">O(n)</div>
              <div className="codeStyle">E113 - unexpected indentation<br />C0304 - Final newline missing</div>
              <div className="memoryUse">74.2MB</div>
              <div className="playTime">0.456789 seconds</div>
            </div>
            
          </div>
        </div>
        <div className='savAndMainBtn'>
          <div className='mainBtn'>
            <div className='btnText'>메인화면</div>
            <div className='btnIcon'><IoHome size = "20px"/></div>
          </div>
          <div className='saveBtn'>
            <div className='btnText'>보고서 저장</div>
            <div className='btnIcon'><BsFillSave2Fill size="20px"/></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
