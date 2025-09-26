import { useMemo } from 'react';
import type { DailyPracticeTime } from '../../features/statistics/api';

interface CalendarViewProps {
  data: DailyPracticeTime[];
  timeWindow: 7 | 30;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  dayOfWeek: number;
  minutes: number;
  intensityLevel: number;
}

interface SummaryStats {
  totalDays: number;
  totalMinutes: number;
  currentStreak: number;
}

export default function CalendarView({ data, timeWindow }: CalendarViewProps) {
  // Process calendar data
  const { calendarGrid, stats, dateRange } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        calendarGrid: [],
        stats: { totalDays: 0, totalMinutes: 0, currentStreak: 0 },
        dateRange: { start: '', end: '' }
      };
    }

    const now = Date.now();
    const cutoffTime = now - (timeWindow * 24 * 60 * 60 * 1000);
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.day + 'T00:00:00');
      return itemDate.getTime() >= cutoffTime;
    });

    if (filteredData.length === 0) {
      return {
        calendarGrid: [],
        stats: { totalDays: 0, totalMinutes: 0, currentStreak: 0 },
        dateRange: { start: '', end: '' }
      };
    }

    // Convert data to calendar days
    const calendarDays: CalendarDay[] = filteredData.map(item => {
      const date = new Date(item.day + 'T00:00:00');
      return {
        date,
        dayOfMonth: date.getDate(),
        dayOfWeek: date.getDay(),
        minutes: item.minutes,
        intensityLevel: getIntensityLevel(item.minutes)
      };
    });

    // Calculate stats
    const stats: SummaryStats = {
      totalDays: filteredData.filter(d => d.minutes > 0).length,
      totalMinutes: filteredData.reduce((sum, d) => sum + d.minutes, 0),
      currentStreak: calculateStreak(filteredData)
    };

    // Get date range
    const firstDate = new Date(filteredData[0].day + 'T00:00:00');
    const lastDate = new Date(filteredData[filteredData.length - 1].day + 'T00:00:00');
    const dateRange = {
      start: formatDateRange(firstDate),
      end: formatDateRange(lastDate)
    };

    // Build grid with proper week alignment
    const grid: (CalendarDay | null)[][] = [];
    let currentWeek: (CalendarDay | null)[] = [];

    // Add empty cells for the first week
    const firstDayOfWeek = calendarDays[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add all days
    calendarDays.forEach(day => {
      currentWeek.push(day);
      if (day.dayOfWeek === 6) { // Saturday
        grid.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add remaining days as last week
    if (currentWeek.length > 0) {
      // Fill the rest of the week with nulls
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      grid.push(currentWeek);
    }

    return { calendarGrid: grid, stats, dateRange };
  }, [data, timeWindow]);

  // Calculate current streak
  function calculateStreak(data: DailyPracticeTime[]): number {
    let streak = 0;
    // Start from the most recent day and work backwards
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].minutes > 0) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Get intensity level for color mapping
  function getIntensityLevel(minutes: number): number {
    if (minutes === 0) return 0;
    if (minutes <= 10) return 1;
    if (minutes <= 20) return 2;
    if (minutes <= 30) return 3;
    return 4;
  }

  // Format date for range display
  function formatDateRange(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  // Format time display
  function formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return (
    <div className="calendar-container">
      {/* Header */}
      <div className="calendar-header">
        <h3 className="heading-3">Study Time Last {timeWindow} Days</h3>
        <p className="body-small text-muted">
          {dateRange.start} - {dateRange.end}
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-wrapper">
        <div className="calendar-weekdays">
          <div className="calendar-weekday">S</div>
          <div className="calendar-weekday">M</div>
          <div className="calendar-weekday">T</div>
          <div className="calendar-weekday">W</div>
          <div className="calendar-weekday">T</div>
          <div className="calendar-weekday">F</div>
          <div className="calendar-weekday">S</div>
        </div>

        <div className="calendar-grid">
          {calendarGrid.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`calendar-cell ${
                    day ? `intensity-${day.intensityLevel}` : 'calendar-cell-empty'
                  }`}
                  title={day ? `${day.minutes} minutes on ${day.date.toLocaleDateString()}` : ''}
                >
                  {day && (
                    <span className="calendar-day-number">{day.dayOfMonth}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="calendar-legend">
        <span className="body-small text-muted">Less</span>
        <div className="legend-squares">
          <div className="calendar-cell intensity-0" title="No practice"></div>
          <div className="calendar-cell intensity-1" title="1-10 minutes"></div>
          <div className="calendar-cell intensity-2" title="10-20 minutes"></div>
          <div className="calendar-cell intensity-3" title="20-30 minutes"></div>
          <div className="calendar-cell intensity-4" title="30+ minutes"></div>
        </div>
        <span className="body-small text-muted">More</span>
      </div>

      {/* Summary Stats */}
      <div className="calendar-stats">
        <div className="stat-card">
          <div className="stat-value">{stats.totalDays}</div>
          <div className="stat-label">Days Practiced</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formatTime(stats.totalMinutes)}</div>
          <div className="stat-label">Total Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.currentStreak}</div>
          <div className="stat-label">Current Streak</div>
        </div>
      </div>
    </div>
  );
}