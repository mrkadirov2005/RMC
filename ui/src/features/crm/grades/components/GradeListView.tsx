// Grade list view – search bar, filter options, grades table with pagination.

import { Pencil, Trash2, Search, Filter, X } from 'lucide-react';
import { termOptions } from '../../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SimplePaginationBar } from '@/components/common/SimplePaginationBar';
import type { paginateItems } from '@/components/common/pagination';
import type { Grade } from '../types';

type PaginatedResult<T> = ReturnType<typeof paginateItems<T>>;

interface GradeListViewProps {
  loading: boolean;
  searchTerm: string;
  filterTerm: string;
  filterGrade: string;
  filterAgeRange: string;
  showFilters: boolean;
  hasActiveFilters: boolean;
  displayedGrades: Grade[];
  paginatedGrades: PaginatedResult<Grade>;
  gradesPageSize: number;
  gradePageSizeOptions: number[];
  onSearchChange: (value: string) => void;
  onFilterTermChange: (value: string) => void;
  onFilterGradeChange: (value: string) => void;
  onFilterAgeRangeChange: (value: string) => void;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (grade: Grade) => void;
  onDelete: (id: number) => void;
  getStudentName: (studentId: number) => string;
  getGradeBadgeClasses: (grade: string) => string;
}

const GradeListView = ({
  loading,
  searchTerm,
  filterTerm,
  filterGrade,
  filterAgeRange,
  showFilters,
  hasActiveFilters,
  displayedGrades,
  paginatedGrades,
  gradesPageSize,
  gradePageSizeOptions,
  onSearchChange,
  onFilterTermChange,
  onFilterGradeChange,
  onFilterAgeRangeChange,
  onToggleFilters,
  onClearFilters,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  getStudentName,
  getGradeBadgeClasses,
}: GradeListViewProps) => {
  return (
    <>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by student or subject..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={onToggleFilters}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {(filterTerm ? 1 : 0) + (filterGrade ? 1 : 0)}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" /> Clear All
          </Button>
        )}

        <div className="text-sm text-muted-foreground flex items-center gap-4">
          <span>{displayedGrades.length} grades</span>
        </div>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={filterTerm} onValueChange={onFilterTermChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Terms</SelectItem>
                {termOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grade Letter</Label>
            <Select value={filterGrade} onValueChange={onFilterGradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Grades</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Age Range</Label>
            <Select value={filterAgeRange} onValueChange={onFilterAgeRangeChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Ages</SelectItem>
                <SelectItem value="3-6">3-6 years</SelectItem>
                <SelectItem value="7-10">7-10 years</SelectItem>
                <SelectItem value="11-14">11-14 years</SelectItem>
                <SelectItem value="15-18">15-18 years</SelectItem>
                <SelectItem value="19-25">19-25 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Grades Table */}
      <div className="border rounded-lg overflow-hidden [&_table]:text-xs [&_th]:text-xs [&_td]:py-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Percentage</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Term</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6">Loading...</TableCell>
              </TableRow>
            ) : displayedGrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  {hasActiveFilters ? 'No grades match your criteria' : 'No grades found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedGrades.items.map((grade) => (
                <TableRow key={grade.grade_id || grade.id}>
                  <TableCell>{getStudentName(grade.student_id)}</TableCell>
                  <TableCell>{grade.subject}</TableCell>
                  <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                  <TableCell>{(Number(grade.percentage) || 0).toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-bold border min-w-[2.5rem] justify-center ${getGradeBadgeClasses(grade.grade_letter)}`}>
                      {grade.grade_letter}
                    </Badge>
                  </TableCell>
                  <TableCell>{grade.term}</TableCell>
                  <TableCell>{grade.academic_year}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(grade)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onDelete(grade.grade_id || grade.id || 0)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <SimplePaginationBar
          total={displayedGrades.length}
          currentPage={paginatedGrades.currentPage}
          totalPages={paginatedGrades.totalPages}
          start={paginatedGrades.start}
          end={paginatedGrades.end}
          pageSize={gradesPageSize}
          pageSizeOptions={gradePageSizeOptions}
          onPageChange={onPageChange}
          onPageSizeChange={(pageSize) => {
            onPageSizeChange(pageSize);
            onPageChange(1);
          }}
        />
      </div>
    </>
  );
};

export default GradeListView;
