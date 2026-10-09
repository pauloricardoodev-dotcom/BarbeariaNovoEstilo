const PageHeader = ({ title, subtitle, children }) => (
  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
    <div className="flex-grow-1">
      {title && <h1 className="page-title mb-1">{title}</h1>}
      {subtitle && <p className="text-secondary mb-0">{subtitle}</p>}
    </div>
    {children && <div className="d-flex gap-2">{children}</div>}
  </div>
);

export default PageHeader;
