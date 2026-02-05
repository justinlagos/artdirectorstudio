import { useState, useEffect } from 'react';
import { CaseStudyCard } from './CaseStudyCard';
import { supabase } from '@/integrations/supabase/client';

interface CaseStudyListProps {
  userId: string;
}

export const CaseStudyList = ({ userId }: CaseStudyListProps) => {
  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaseStudies();
  }, [userId]);

  const loadCaseStudies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_studies')
        .select('*')
        .eq('user_id', userId)
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaseStudies(data || []);
    } catch (error) {
      console.error('Error loading case studies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8"><p className="text-sm text-muted-foreground">Loading case studies...</p></div>;
  }

  if (caseStudies.length === 0) {
    return <div className="text-center py-12"><p className="text-sm text-muted-foreground">No case studies yet</p></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {caseStudies.map((study) => (
        <CaseStudyCard key={study.id} caseStudy={study} />
      ))}
    </div>
  );
};
