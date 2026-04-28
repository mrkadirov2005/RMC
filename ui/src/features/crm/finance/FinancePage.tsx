// Page component for the finance screen in the crm feature.

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Search, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '../hooks';
import { fetchTeachers } from '@/slices/teachersSlice';

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  username?: string;
}

// Renders the finance page screen.
const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const dispatch = useAppDispatch();
  const teachers = useAppSelector((state) => state.teachers.items) as Teacher[];
  const isLoading = useAppSelector((state) => state.teachers.loading);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchTeachers());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Memoizes the filtered teachers derived value.
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachers;
    const term = searchTerm.toLowerCase();
    return teachers.filter((teacher: Teacher) => {
      const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase();
      return fullName.includes(term) || teacher.email?.toLowerCase().includes(term);
    });
  }, [teachers, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2 dark:text-white">
          <DollarSign className="h-8 w-8 text-green-600" />
          Finance Management
        </h1>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <Input
            placeholder="Search teachers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-950 text-black dark:text-white border-gray-300 dark:border-slate-700"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher: Teacher) => (
          <div
            key={teacher.teacher_id || teacher.id}
            className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 shadow hover:shadow-lg transition-shadow p-6 cursor-pointer dark:hover:bg-slate-800"
            onClick={() => navigate(`/finance/teacher/${teacher.teacher_id || teacher.id}`)}
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                {teacher.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{teacher.email}</p>
                )}
                {teacher.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{teacher.phone}</p>
                )}
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/finance/teacher/${teacher.teacher_id || teacher.id}`);
                }}
                className="w-full"
                variant="outline"
              >
                View Finance Details
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No teachers found</p>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
