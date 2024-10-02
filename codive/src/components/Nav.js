import React from 'react';
import { NavLink } from 'react-router-dom';
import '../Nav.css';

//icons 
import { IoIosTimer } from "react-icons/io";
import { SlPeople } from "react-icons/sl";

function Nav() {
  return (
    <div id="Nav">
      <div className="logo">itslogo</div>
      <div className="settings">
        <div className="restPeople">
          <div className="restPeople_icon settingsIcon"><SlPeople size="20" /></div>
          <div className="restPeople_text settingsText">남은 인원</div>
          <div className="restPeople_num settingsNum">01 / 05</div>
        </div>
        <div className="timer">
          <div className="timer_icon settingsIcon"><IoIosTimer  size="20"/></div>
          <div className="timer_text settingsText">진행 시간</div>
          <div className="timer_num settingsNum">00 : 03 : 15</div>
        </div>
      </div>

    </div>
  );
}

export default Nav;
