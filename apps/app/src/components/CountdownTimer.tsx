import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: Date;
  onCompleted?: () => void;
}

export function CountdownTimer({ targetDate, onCompleted }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (hasCompleted) return;

    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference <= 0) {
        setHasCompleted(true);
        if (onCompleted) onCompleted();
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, hasCompleted, onCompleted]);

  if (hasCompleted) {
    return <span className="text-red-500 font-medium">Has started</span>;
  }

  return (
    <div className="flex gap-2">
      {timeLeft.days > 0 && (
        <span className="bg-secondary px-2 py-1 rounded text-sm">
          {timeLeft.days}d
        </span>
      )}
      <span className="bg-secondary px-2 py-1 rounded text-sm">
        {timeLeft.hours}h
      </span>
      <span className="bg-secondary px-2 py-1 rounded text-sm">
        {timeLeft.minutes}m
      </span>
      <span className="bg-secondary px-2 py-1 rounded text-sm">
        {timeLeft.seconds}s
      </span>
    </div>
  );
}