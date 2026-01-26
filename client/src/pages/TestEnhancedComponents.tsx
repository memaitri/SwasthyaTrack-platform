import { useState } from "react";
import { EnhancedMetricCard } from "@/components/dashboard/EnhancedMetricCard";
import { EnhancedChartContainer } from "@/components/charts/EnhancedChartContainer";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { InteractivePieChart } from "@/components/charts/InteractivePieChart";
import { InteractiveLineChart } from "@/components/charts/InteractiveLineChart";
import { DrillDownProvider } from "@/components/dashboard/DrillDownProvider";
import { BreadcrumbNavigation } from "@/components/dashboard/BreadcrumbNavigation";
import { FilterPanel } from "@/components/dashboard/FilterPanel";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, School, Activity, TrendingUp } from "lucide-react";

export default function TestEnhancedComponents() {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    timeRange: "30d",
    category: "all"
  });

  const handleFilterChange = (values: Record<string, any>) => {
    setFilterValues(values);
  };

  const sampleData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [{
      label: "Users",
      data: [65, 59, 80, 81, 56],
      backgroundColor: ["hsl(142, 76%, 36%)", "hsl(210, 70%, 50%)", "hsl(280, 65%, 60%)", "hsl(43, 74%, 49%)", "hsl(350, 70%, 50%)"],
      borderColor: "hsl(var(--border))"
    }]
  };

  const filterOptions = [
    {
      id: 'timeRange',
      label: 'Time Range',
      type: 'select' as const,
      options: [
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 3 months' }
      ]
    },
    {
      id: 'category',
      label: 'Category',
      type: 'select' as const,
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'health', label: 'Health' },
        { value: 'education', label: 'Education' }
      ]
    }
  ];

  return (
    <DrillDownProvider initialLevel={{ id: 'test', title: 'Test Dashboard', data: {} }}>
      <AppLayout title="Enhanced Components Test">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold">Enhanced Dashboard Components Test</h1>
            <BreadcrumbNavigation />
          </div>

          <FilterPanel
            filters={filterOptions}
            values={filterValues}
            onChange={handleFilterChange}
            showApplyButton={false}
          />

          {/* Enhanced Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EnhancedMetricCard
              title="Total Users"
              value={1250}
              icon={Users}
              variant="default"
              trend={{ value: 12, isPositive: true }}
              animationDelay={0}
              showSparkline={true}
              sparklineData={[45, 52, 48, 61, 58, 65, 72]}
            />
            
            <EnhancedMetricCard
              title="Schools"
              value={85}
              icon={School}
              variant="success"
              trend={{ value: 8, isPositive: true }}
              animationDelay={100}
            />
            
            <EnhancedMetricCard
              title="Active Today"
              value={342}
              icon={Activity}
              variant="info"
              trend={{ value: -3, isPositive: false }}
              animationDelay={200}
            />
            
            <EnhancedMetricCard
              title="Growth Rate"
              value="15.2%"
              icon={TrendingUp}
              variant="warning"
              trend={{ value: 5, isPositive: true }}
              animationDelay={300}
            />
          </div>

          {/* Interactive Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedChartContainer
              title="Interactive Bar Chart"
              chartType="bar"
              animationDelay={400}
              showInsights={true}
              insights={["Peak usage in March", "Steady growth trend", "Mobile users increasing"]}
            >
              <InteractiveBarChart
                labels={sampleData.labels}
                datasets={[sampleData.datasets[0]]}
                enableDrillDown={true}
                onBarClick={(index, datasetIndex, value, label) => 
                  console.log('Bar clicked:', { index, datasetIndex, value, label })
                }
              />
            </EnhancedChartContainer>

            <EnhancedChartContainer
              title="Interactive Pie Chart"
              chartType="pie"
              animationDelay={500}
            >
              <InteractivePieChart
                labels={sampleData.labels}
                data={sampleData.datasets[0].data}
                backgroundColor={sampleData.datasets[0].backgroundColor}
                doughnut={true}
                enableDrillDown={true}
                onSegmentClick={(index, value, label, percentage) =>
                  console.log('Segment clicked:', { index, value, label, percentage })
                }
                centerText="341"
                centerSubtext="Total"
              />
            </EnhancedChartContainer>
          </div>

          <EnhancedChartContainer
            title="Interactive Line Chart"
            chartType="line"
            animationDelay={600}
            subtitle="Trend analysis with interactive features"
          >
            <InteractiveLineChart
              labels={sampleData.labels}
              datasets={[{
                label: "Growth Trend",
                data: sampleData.datasets[0].data,
                borderColor: "hsl(142, 76%, 36%)",
                backgroundColor: "hsla(142, 76%, 36%, 0.1)",
                fill: true
              }]}
              onPointClick={(dataIndex, datasetIndex, value, label) =>
                console.log('Point clicked:', { dataIndex, datasetIndex, value, label })
              }
              showTrendline={true}
              enableCrosshair={true}
            />
          </EnhancedChartContainer>
        </div>
      </AppLayout>
    </DrillDownProvider>
  );
}