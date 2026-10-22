// demo.tsx
import React from 'react';
import Component from '@/components/ui/stacking-card';

const projects = [
  {
    title: 'Directed Graph Logic',
    description:
      'No dead-end loops or orphan nodes. Mathematical validation algorithms guarantee every path leads to a satisfying narrative outcome.',
    link: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    color: '#ffffff',
  },
  {
    title: 'XP & Rewards Progression',
    description:
      'Earn XP upon completing stories and unlocking unique story endings to level up your reader profile and rise up the global leaderboard.',
    link: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
    color: '#ffd731',
  },
  {
    title: 'Time-Warp Retreat',
    description:
      'Made a fatal choice? Use your retreat token to step back through time and alter your path without restarting your entire adventure.',
    link: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&w=800&q=80',
    color: '#55db9c',
  },
  {
    title: 'Visual Node Builder',
    description:
      'Admins can write branching scenes, connect decision points, set win/lose endings, and publish interactive experiences instantly.',
    link: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    color: '#e9ccff',
  },
];

function ComponentDemo() {
  return (
    <Component projects={projects} />
  );
}

export { ComponentDemo as DemoOne };
export default ComponentDemo;
