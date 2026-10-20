export const dailySupplyData = {
  description: 'Daily Supply connects neighborhood retailers, daily essentials vendors, and residential communities through billing, inventory, subscriptions, and community ordering.',
  challenges: [
    { number: '01', title: 'One store. Too many moving parts.', problem: 'Billing at the counter, checking stock, and maintaining customer credit can become separate jobs with separate records.', solution: 'Bring billing, inventory, and digital khata records into a connected store workflow.', label: 'Connected store operations', icon: 'store' },
    { number: '02', title: 'Daily needs. Repeated coordination.', problem: 'Recurring essentials mean keeping track of delivery schedules, changing quantities, and subscription pauses day after day.', solution: 'Organize recurring milk and essentials subscriptions, with schedules that reflect changing household needs.', label: 'Everyday subscriptions', icon: 'milk' },
    { number: '03', title: 'A community, connected by scattered messages.', problem: 'Resident requests and payment records are harder to follow when they live across messages, calls, and notebooks.', solution: 'Connect community ordering with fulfilment and organized customer payment records.', label: 'Community commerce', icon: 'community' },
  ],
  journey: [
    { title: 'Residents order', text: 'A household places an essentials order or arranges a recurring supply.', icon: 'basket' },
    { title: 'Stores prepare', text: 'The neighborhood retailer manages the order alongside stock and billing.', icon: 'store' },
    { title: 'Vendors coordinate', text: 'Daily essentials vendors organize recurring supplies and delivery schedules.', icon: 'truck' },
    { title: 'Records stay together', text: 'Orders, billing, and customer credit stay part of a connected workflow.', icon: 'records' },
  ],
  audiences: [
    { number: '01', title: 'Neighborhood retailers', text: 'For the local store balancing counter sales, inventory, and familiar customers’ credit accounts.', example: 'From the first sale to the end-of-day stock check.', icon: 'store' },
    { number: '02', title: 'Milk & essentials vendors', text: 'For suppliers managing recurring household needs and the changes that come with them.', example: 'A regular milk order. A changed quantity. A planned pause.', icon: 'milk' },
    { number: '03', title: 'Residential communities', text: 'For communities connecting residents with nearby stores and everyday essentials.', example: 'Everyday shopping, closer to the people it serves.', icon: 'community' },
  ],
};
