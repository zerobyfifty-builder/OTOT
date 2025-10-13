import { useNavigate } from "react-router-dom";
import { useLodgeAuth } from "@/contexts/LodgeAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Star, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const LodgePerformance = () => {
  const navigate = useNavigate();
  const { lodge } = useLodgeAuth();

  const metrics = [
    { label: "Response Time", score: 4.9, value: "2.3 hours", status: "Excellent", color: "text-green-600" },
    { label: "Tree Survival Rate", score: 4.7, value: "92%", status: "Great", color: "text-green-600" },
    { label: "Photo Quality", score: 4.8, value: "High", status: "Excellent", color: "text-green-600" },
    { label: "Update Frequency", score: 4.6, value: "Regular", status: "Good", color: "text-blue-600" },
    { label: "Tourist Satisfaction", score: 4.9, value: "4.9/5", status: "Excellent", color: "text-green-600" },
  ];

  const reviews = [
    { tourist: "Jane Doe", rating: 5, comment: "Amazing experience! The tree planting was well organized.", date: "Oct 10, 2024" },
    { tourist: "Mike Chen", rating: 5, comment: "Great service and beautiful location for the tree.", date: "Oct 8, 2024" },
    { tourist: "Sarah Jones", rating: 4, comment: "Good experience, would recommend.", date: "Oct 5, 2024" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lodge/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{lodge?.name}</h1>
            <p className="text-gray-600">Performance Metrics</p>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-gray-600 mb-2">Overall Performance Score</p>
                <div className="flex items-center gap-3">
                  <span className="text-6xl font-bold text-green-600">4.8</span>
                  <span className="text-3xl text-gray-400">/5</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <Award className="w-24 h-24 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{metric.score}</span>
                    <span className="text-gray-400">/5</span>
                  </div>
                  <Progress value={metric.score * 20} className="h-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{metric.value}</span>
                    <span className={`text-sm font-medium ${metric.color}`}>{metric.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benchmarking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Benchmarking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Your Rank</p>
                <p className="text-2xl font-bold text-blue-600">#2</p>
                <p className="text-sm text-gray-500">out of 89 lodges</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Trees Planted</p>
                <p className="text-2xl font-bold text-green-600">456</p>
                <p className="text-sm text-green-600">+46% vs average (312)</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Top Performer</p>
                <p className="text-sm font-semibold text-purple-600">Safari Lodge</p>
                <p className="text-xs text-gray-500">Maasai Mara</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tourist Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviews.map((review, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{review.tourist}</p>
                    <div className="flex gap-1 mt-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
