import React from 'react';
import { useCRM } from '../../lib/store';
import { isRepresentadaUser, isAssociadoUser } from '../../types';
import { ExecutiveDashboardView } from './ExecutiveDashboardView';
import { RepresentadaDashboardView } from './RepresentadaDashboardView';
import { AssociadoDashboardView } from './AssociadoDashboardView';

export const DashboardView: React.FC = () => {
  const { currentMember } = useCRM();
  const roleCode = currentMember?.role_code;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Role-based Dashboard Dispatcher */}
      {isRepresentadaUser(roleCode) ? (
        <RepresentadaDashboardView />
      ) : isAssociadoUser(roleCode) ? (
        <AssociadoDashboardView />
      ) : (
        <ExecutiveDashboardView />
      )}
    </div>
  );
};

