import { 
  Footprints, 
  MessageCircle, 
  PartyPopper, 
  Coffee, 
  Smartphone,
  MoreHorizontal
} from "lucide-react";
import activityWalk from "@/assets/mitra-landing/activity-walk.jpg";
import activityChat from "@/assets/mitra-landing/activity-chat.jpg";
import activityEvent from "@/assets/mitra-landing/activity-event.jpg";
import activityDining from "@/assets/mitra-landing/activity-dining.jpg";
import activityVirtual from "@/assets/mitra-landing/activity-virtual.jpg";
import activityOthers from "@/assets/mitra-landing/activity-others.jpg"; // Gambar baru untuk "dan lain lain"

const activities = [
  {
    icon: Footprints,
    title: "Teman Jalan Santai",
    desc: "Menemani jalan-jalan di mall, taman, atau tempat wisata",
    image: activityWalk,
  },
  {
    icon: MessageCircle,
    title: "Teman Ngobrol & Curhat",
    desc: "Menjadi pendengar yang baik dan teman berbagi cerita",
    image: activityChat,
  },
  {
    icon: PartyPopper,
    title: "Teman Menghadiri Acara",
    desc: "Menemani ke pesta, reuni, atau acara formal lainnya",
    image: activityEvent,
  },
  {
    icon: Coffee,
    title: "Teman Makan atau Nongkrong",
    desc: "Menemani makan siang, dinner, atau ngopi santai",
    image: activityDining,
  },
  {
    icon: Smartphone,
    title: "Teman Virtual (Chat)",
    desc: "Menemani ngobrol lewat chat kapan saja",
    image: activityVirtual,
  },
  {
    icon: MoreHorizontal,
    title: "Dan Lain Lain",
    desc: "Berbagai aktivitas lainnya yang bisa disesuaikan dengan kebutuhanmu",
    image: activityOthers,
  },
];

const Activities = () => {
  return (
    <section id="aktivitas" className="py-20 gradient-hero-soft">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Aktivitas yang Bisa Dilakukan Mitra
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Berbagai aktivitas sosial yang bisa kamu lakukan sebagai mitra profesional
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {activities.map((activity, index) => (
            <div
              key={activity.title}
              className="group rounded-2xl bg-card shadow-card border border-border/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="h-40 overflow-hidden">
                <img 
                  src={activity.image} 
                  alt={activity.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              
              {/* Content */}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <activity.icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {activity.title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm">{activity.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10 bg-accent/50 inline-block mx-auto px-6 py-3 rounded-full">
          ✨ Semua aktivitas bersifat profesional dan mengikuti aturan platform
        </p>
      </div>
    </section>
  );
};

export default Activities;