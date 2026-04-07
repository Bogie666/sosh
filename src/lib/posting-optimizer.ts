// src/lib/posting-optimizer.ts
// Intelligent posting time optimization based on platform best practices and business settings

export interface OptimalPostingTime {
  hour: number
  minute: number
  label: string
  reason: string
  engagementScore: number // 0-100 expected relative engagement
}

export interface DaySchedule {
  day: string
  times: OptimalPostingTime[]
}

// Platform-specific optimal posting windows based on industry research
// These are general best practices; business-specific overrides take priority
const PLATFORM_OPTIMAL_TIMES: Record<string, OptimalPostingTime[]> = {
  facebook: [
    { hour: 9, minute: 0, label: '9:00 AM', reason: 'Morning commute check-in', engagementScore: 75 },
    { hour: 12, minute: 0, label: '12:00 PM', reason: 'Lunch break browsing peak', engagementScore: 85 },
    { hour: 15, minute: 0, label: '3:00 PM', reason: 'Afternoon scroll break', engagementScore: 70 },
    { hour: 19, minute: 0, label: '7:00 PM', reason: 'Evening leisure browsing', engagementScore: 80 },
  ],
  instagram: [
    { hour: 7, minute: 0, label: '7:00 AM', reason: 'Early morning scrolling', engagementScore: 70 },
    { hour: 11, minute: 30, label: '11:30 AM', reason: 'Pre-lunch engagement peak', engagementScore: 85 },
    { hour: 14, minute: 0, label: '2:00 PM', reason: 'Afternoon engagement window', engagementScore: 75 },
    { hour: 19, minute: 0, label: '7:00 PM', reason: 'Evening peak engagement', engagementScore: 90 },
  ],
  twitter: [
    { hour: 8, minute: 0, label: '8:00 AM', reason: 'Morning news check', engagementScore: 80 },
    { hour: 12, minute: 0, label: '12:00 PM', reason: 'Lunchtime scrolling', engagementScore: 85 },
    { hour: 17, minute: 0, label: '5:00 PM', reason: 'End of workday catch-up', engagementScore: 75 },
  ],
  google: [
    { hour: 10, minute: 0, label: '10:00 AM', reason: 'Business hours - customers searching for services', engagementScore: 85 },
    { hour: 14, minute: 0, label: '2:00 PM', reason: 'Afternoon service research', engagementScore: 75 },
  ]
}

// Day-of-week engagement multipliers (1.0 = baseline)
const DAY_MULTIPLIERS: Record<string, Record<string, number>> = {
  facebook: {
    monday: 0.9, tuesday: 1.0, wednesday: 1.1, thursday: 1.0,
    friday: 0.95, saturday: 0.85, sunday: 0.8
  },
  instagram: {
    monday: 0.95, tuesday: 1.05, wednesday: 1.1, thursday: 1.05,
    friday: 1.0, saturday: 0.9, sunday: 0.85
  },
  twitter: {
    monday: 1.0, tuesday: 1.05, wednesday: 1.1, thursday: 1.0,
    friday: 0.95, saturday: 0.75, sunday: 0.7
  },
  google: {
    monday: 1.0, tuesday: 1.05, wednesday: 1.0, thursday: 1.0,
    friday: 0.95, saturday: 0.8, sunday: 0.7
  }
}

/**
 * Get optimal posting times for a platform on a specific day.
 * If the business has custom posting schedule in their profile, those override defaults.
 */
export function getOptimalPostingTimes(
  platform: string,
  day: string,
  businessPostingSchedule?: Record<string, any> | null
): OptimalPostingTime[] {
  // Check for business-specific overrides first
  if (businessPostingSchedule) {
    const customTimes = businessPostingSchedule[platform]?.[day]
    if (customTimes && Array.isArray(customTimes) && customTimes.length > 0) {
      return customTimes.map((t: any) => ({
        hour: t.hour,
        minute: t.minute || 0,
        label: formatTime(t.hour, t.minute || 0),
        reason: 'Custom business schedule',
        engagementScore: 80
      }))
    }
  }

  const baseTimes = PLATFORM_OPTIMAL_TIMES[platform] || PLATFORM_OPTIMAL_TIMES.facebook
  const dayMultiplier = DAY_MULTIPLIERS[platform]?.[day.toLowerCase()] || 1.0

  return baseTimes.map(time => ({
    ...time,
    engagementScore: Math.round(time.engagementScore * dayMultiplier)
  })).sort((a, b) => b.engagementScore - a.engagementScore)
}

/**
 * Get the single best posting time for a platform+day combo
 */
export function getBestPostingTime(
  platform: string,
  day: string,
  businessPostingSchedule?: Record<string, any> | null
): OptimalPostingTime {
  const times = getOptimalPostingTimes(platform, day, businessPostingSchedule)
  return times[0]
}

/**
 * Generate a full week schedule for a platform
 */
export function getWeeklySchedule(
  platform: string,
  businessPostingSchedule?: Record<string, any> | null
): DaySchedule[] {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  return days.map(day => ({
    day,
    times: getOptimalPostingTimes(platform, day, businessPostingSchedule)
  }))
}

/**
 * Suggest posting times for batch content generation.
 * Spaces posts out across the week for maximum reach.
 */
export function suggestBatchPostingTimes(
  platform: string,
  postCount: number,
  startDate: Date,
  businessPostingSchedule?: Record<string, any> | null
): Array<{ date: Date; time: OptimalPostingTime }> {
  const suggestions: Array<{ date: Date; time: OptimalPostingTime }> = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < postCount; i++) {
    const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const bestTime = getBestPostingTime(platform, dayName, businessPostingSchedule)

    const postDate = new Date(currentDate)
    postDate.setHours(bestTime.hour, bestTime.minute, 0, 0)

    suggestions.push({ date: postDate, time: bestTime })

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return suggestions
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const displayMinute = minute.toString().padStart(2, '0')
  return `${displayHour}:${displayMinute} ${period}`
}
