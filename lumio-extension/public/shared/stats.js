// turns dailyHistory (see storage.js) into the numbers the dashboard shows in Live mode.
// pure functions: no chrome calls, so they're easy to test
//
// definitions:
// - week = Monday to Sunday of the current week
// - weekly coin = 30 minutes with AI that day (max 6 coins = 3h+)
// - cross-referencing rate = claims verified this week ÷ AI sessions this week, capped at 100%
// - streak day = a day with at least 1 verified claim; the streak counts back from today
//   (or from yesterday if nothing is verified yet today, so the streak isn't "lost" in the morning)
// - monthly = the current calendar month
import { dayKey, emptyDay } from "./storage.js";

const DAY_NAMES = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const MINUTES_PER_COIN = 30;
const MAX_COINS = 6;

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function getDay(history, date) {
    return { ...emptyDay(), ...history[dayKey(date)] };
}

export function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// the 7 dates of the current week, Monday first
export function getWeekDates(now = new Date()) {
    const daysSinceMonday = (now.getDay() + 6) % 7;
    const monday = addDays(now, -daysSinceMonday);
    return DAY_NAMES.map((_, i) => addDays(monday, i));
}

export function getStreak(history, now = new Date()) {
    let date = getDay(history, now).claims > 0 ? now : addDays(now, -1);
    let streak = 0;
    while (getDay(history, date).claims > 0) {
        streak++;
        date = addDays(date, -1);
    }
    return streak;
}

// minutes per day (Monday first) -> rows for the weekly coins chart
function buildWeekRows(minutesPerDay) {
    return DAY_NAMES.map((day, i) => {
        const minutes = minutesPerDay[i] || 0;
        return {
            day,
            score: Math.min(MAX_COINS, Math.ceil(minutes / MINUTES_PER_COIN)),
            tooltip: `${formatMinutes(minutes)} with AI`
        };
    });
}

export function buildLiveView(history, now = new Date()) {
    const today = getDay(history, now);
    const week = getWeekDates(now).map(date => getDay(history, date));

    const weeklyActivity = buildWeekRows(week.map(day => day.minutes));

    const weekClaims = week.reduce((sum, day) => sum + day.claims, 0);
    const weekSessions = week.reduce((sum, day) => sum + day.sessions, 0);
    const rate = weekSessions > 0 ? Math.min(100, Math.round((weekClaims / weekSessions) * 100)) : null;

    // everything in the current calendar month
    const monthPrefix = dayKey(now).slice(0, 7); // "YYYY-MM"
    const month = Object.keys(history)
        .filter(key => key.startsWith(monthPrefix))
        .map(key => ({ ...emptyDay(), ...history[key] }));

    const domainTotals = {};
    for (const day of month) {
        for (const [domain, minutes] of Object.entries(day.domainMinutes)) {
            domainTotals[domain] = (domainTotals[domain] || 0) + minutes;
        }
    }
    const domainBreakdown = Object.entries(domainTotals).map(([domain, timeMinutes]) => ({ domain, timeMinutes }));

    return {
        weeklyActivity,
        compassStats: { today: today.claims, week: weekClaims, rate }, // rate null = no sessions this week
        monthlyMinutes: month.reduce((sum, day) => sum + day.minutes, 0),
        monthlySessions: month.reduce((sum, day) => sum + day.sessions, 0),
        monthlyClaims: month.reduce((sum, day) => sum + day.claims, 0),
        streak: getStreak(history, now),
        domainBreakdown,
        platformTotalMinutes: domainBreakdown.reduce((sum, d) => sum + d.timeMinutes, 0)
    };
}
