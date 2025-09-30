import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Download, FileText } from 'lucide-react';

export default function Reports() {
  const [loading, setLoading] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      toast({ title: 'No data', description: 'No data available to export' });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportTrees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trees')
        .select('*');

      if (error) throw error;

      const formattedData = data?.map(tree => ({
        'OTOT ID': tree.otot_id,
        'User ID': tree.user_id,
        'Number of Trees': tree.num_trees,
        'Amount Paid': tree.amount_paid,
        'Purchase Date': new Date(tree.created_at).toLocaleDateString(),
        'Status': tree.status,
        'Plant Date': tree.plant_date || '',
        'Tree Type': tree.tree_type || '',
        'Location': tree.location_name || '',
      })) || [];

      exportToCSV(formattedData, `trees_report_${new Date().toISOString().split('T')[0]}`);
      toast({ title: 'Success', description: 'Trees report exported' });
    } catch (error) {
      console.error('Error exporting trees:', error);
      toast({ title: 'Error', description: 'Failed to export trees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');

      if (error) throw error;

      const formattedData = data?.map(user => ({
        'OTOT ID': user.otot_id || '',
        'Email': user.email,
        'Pledge Status': user.pledge_status ? 'Yes' : 'No',
        'Pledge Date': user.pledge_date ? new Date(user.pledge_date).toLocaleDateString() : '',
        'Total Donation': user.total_donation,
        'Created At': new Date(user.created_at).toLocaleDateString(),
      })) || [];

      exportToCSV(formattedData, `users_report_${new Date().toISOString().split('T')[0]}`);
      toast({ title: 'Success', description: 'Users report exported' });
    } catch (error) {
      console.error('Error exporting users:', error);
      toast({ title: 'Error', description: 'Failed to export users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportTrips = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*');

      if (error) throw error;

      const formattedData = data?.map(trip => ({
        'User ID': trip.user_id,
        'Origin': trip.origin_airport,
        'Destination': trip.destination_airport,
        'Travel Class': trip.travel_class,
        'Travelers': trip.num_travelers,
        'From Date': new Date(trip.from_date).toLocaleDateString(),
        'To Date': trip.to_date ? new Date(trip.to_date).toLocaleDateString() : '',
        'Flight CO2': trip.flight_co2,
        'Accommodation CO2': trip.accommodation_co2,
        'Total CO2': trip.total_co2,
        'Trees Needed': trip.trees_needed,
      })) || [];

      exportToCSV(formattedData, `trips_report_${new Date().toISOString().split('T')[0]}`);
      toast({ title: 'Success', description: 'Trips report exported' });
    } catch (error) {
      console.error('Error exporting trips:', error);
      toast({ title: 'Error', description: 'Failed to export trips', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reports & Exports</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Trees Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all tree purchases with user details, status, and location information.
            </p>
            <Button onClick={exportTrees} disabled={loading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Trees CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Users Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all registered users with pledge status and donation information.
            </p>
            <Button onClick={exportUsers} disabled={loading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Users CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Trips Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Export all calculated trips with CO2 emissions and offset details.
            </p>
            <Button onClick={exportTrips} disabled={loading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Trips CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
