import React, { useState, useEffect } from 'react';
import { IoIosTimer } from "react-icons/io";
import '../Nav.css';
import { SlPeople } from "react-icons/sl";
import { useLocation } from 'react-router-dom'; 

function Nav() {
  const [remainingUsers, setRemainingUsers] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [roomCode, setRoomCode] = useState("");
  const [whouser, setWhoUser] = useState("");
  const location = useLocation();

  useEffect(() => {
    const guestId = getCookieValue('guest_id');
    setWhoUser(guestId);
    if (guestId) {
      const roomId = guestId.split('-')[0];
      setRoomCode(roomId);
    }
    
    const savedTime = getCookieValue('elapsedTime');
    if (savedTime) {
      setElapsedTime(parseInt(savedTime, 10));
    }

    const savedRemainingUsers = getCookieValue('remainingUsers');
    if (savedRemainingUsers) {
      setRemainingUsers(parseInt(savedRemainingUsers, 10));
    }
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    fetchUserStats();

    let timer;
    if (location.pathname !== '/report') {
      timer = setInterval(() => {
        setElapsedTime(prevTime => {
          const newTime = prevTime + 1;
          document.cookie = `elapsedTime=${newTime}; path=/`;
          return newTime;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [roomCode, location.pathname]);

  useEffect(() => {
    document.cookie = `remainingUsers=${remainingUsers}; path=/`;
  }, [remainingUsers]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(`https://codive-backend.onrender.com/api/room/${roomCode}/user_stats`);
      const data = await response.json();
      setRemainingUsers(data.active_users);
      setTotalUsers(data.total_users);
    } catch (error) {
      console.error("Failed to fetch user stats", error);
    }
  };
  
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')} : ${mins.toString().padStart(2, '0')} : ${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div id="Nav">
      <div className="logo">Codive</div>
      <div className="settings">
        {location.pathname === '/report' && (
          <div className="restPeople">
            <div className="restPeople_icon settingsIcon"><SlPeople size="20" /></div>
            <div className="restPeople_text settingsText">남은 인원</div>
            <div className="restPeople_num settingsNum">{remainingUsers} / {totalUsers}</div>
          </div>
        )}
        <div className="timer">
          <div className="timer_icon settingsIcon"><IoIosTimer size="20" /></div>
          <div className="timer_text settingsText">진행 시간</div>
          <div className="timer_num settingsNum"> {formatTime(elapsedTime)}</div>
        </div>
      </div>
    </div>
  );
}

export default Nav;

function getCookieValue(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}
