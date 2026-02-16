import type { Task } from './types'

export const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    title: 'Share the recap',
    description: 'Summarize the meeting and send to the Heavyweight Telegram chat',
    status: 'selected',
  },
  {
    id: '2',
    title: 'Draft for a marketing strategy',
    description: 'For a weekend conference call',
    status: 'selected',
  },
  {
    id: '3',
    title: 'Outline the Q3 goals',
    description: 'Before the strategy meeting',
    status: 'selected',
  },
  {
    id: '4',
    title: 'Send follow-up to Anna',
    description: 'Regarding the partnership proposal discussed on the call',
    status: 'selected',
  },
]

export const TASK_PRESETS = [
  {
    title: 'Share the recap',
    description: 'Summarize the meeting and send to the Heavyweight Telegram chat',
  },
  {
    title: 'Draft for a marketing strategy',
    description: 'For a weekend conference call',
  },
  {
    title: 'Outline the Q3 goals',
    description: 'Before the strategy meeting',
  },
  {
    title: 'Send follow-up to Anna',
    description: 'Regarding the partnership proposal discussed on the call',
  },
  {
    title: 'Book a restaurant for Friday',
    description: 'Italian place near the office, party of 4',
  },
  {
    title: 'Update the project timeline',
    description: 'Shift milestones based on the new deadline',
  },
]
