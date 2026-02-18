'use client';

import { HelpCircle } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="h-full">
      <div className="border-b border-border bg-background px-8 py-6">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Help & Resources</h1>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Getting Started</h2>
            <p className="text-muted-foreground">
              Welcome to Tickly! Start by creating projects and adding tasks to stay organized.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Features</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Create and manage projects</li>
              <li>Add tasks to projects</li>
              <li>Mark tasks as complete</li>
              <li>View tasks by date (Today, Upcoming)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
