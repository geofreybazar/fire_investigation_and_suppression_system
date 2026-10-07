interface PageHeaderProps {
  title: string;
  description: string;
}

const PageHeader = ({ title, description }: PageHeaderProps) => {
  return (
    <div>
      <h1 className='text-xl md:text-2xl font-semibold tracking-tight'>
        {title}
      </h1>

      <p className='text-sm text-muted-foreground'>{description}</p>
    </div>
  );
};

export default PageHeader;
