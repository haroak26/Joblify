export { ModernTemplate } from './ModernTemplate';
export { ProfessionalTemplate } from './ProfessionalTemplate';
export { CreativeTemplate } from './CreativeTemplate';
export { ExecutiveTemplate } from './ExecutiveTemplate';
export { TechnicalTemplate } from './TechnicalTemplate';

import { ModernTemplate } from './ModernTemplate';
import { ProfessionalTemplate } from './ProfessionalTemplate';
import { CreativeTemplate } from './CreativeTemplate';
import { ExecutiveTemplate } from './ExecutiveTemplate';
import { TechnicalTemplate } from './TechnicalTemplate';
import type { ResumeTemplateId } from '@shared/schema';

export const TEMPLATE_COMPONENTS: Record<ResumeTemplateId, React.ComponentType<any>> = {
  modern: ModernTemplate,
  professional: ProfessionalTemplate,
  creative: CreativeTemplate,
  executive: ExecutiveTemplate,
  technical: TechnicalTemplate,
};
