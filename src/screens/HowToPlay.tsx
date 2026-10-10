import { useApp } from '../state/AppContext';
import type { Route } from '../state/router';
import { hi } from '../i18n/hi';
import { TopBar } from '../ui/controls';
import { ALL_CARDS } from '../content';

export function HowToPlay({ navigate }: { navigate: (r: Route) => void }) {
  const { prefs } = useApp();
  const r = prefs.rules;
  const example = ALL_CARDS.find((c) => c.id === 'jt1-019') ?? ALL_CARDS[0];
  const end = r.endCondition;

  return (
    <main className="screen">
      <TopBar title={hi.home.howTo} onBack={() => navigate('home')} />
      <article className="panel prose">
        <h2>खेल का सार</h2>
        <p>
          दो या अधिक टीमें बारी-बारी से खेलती हैं। हर बारी में टीम का एक खिलाड़ी कार्ड पर लिखा <b>मुख्य शब्द</b> अपनी टीम को समझाता है — पर
          कार्ड पर लिखे <b>मना शब्द</b> और मुख्य शब्द खुद बोले बिना। टीम समय खत्म होने से पहले जितने शब्द पहचान ले, उतने अंक।
        </p>
        {example && (
          <div className="demo-card" aria-label="उदाहरण कार्ड">
            <b lang="hi">{example.target}</b>
            {example.forbidden.map((w) => (
              <span key={w} lang="hi">
                {w}
              </span>
            ))}
          </div>
        )}
        <h2>एक बारी</h2>
        <ol>
          <li>फ़ोन बताने वाले खिलाड़ी को दें; उसकी टीम स्क्रीन न देखे।</li>
          <li>“शुरू करें” दबाते ही समय चलने लगता है।</li>
          <li>
            टीम सही अनुमान लगाए तो <b>सही</b> दबाएँ, कठिन लगे तो <b>छोड़ें</b>।
          </li>
          <li>
            बताने वाला कोई मना शब्द (या मुख्य शब्द) बोल दे तो <b>मना शब्द</b> दबाएँ — विरोधी टीम इसी पर नज़र रखती है। ऐप बोले गए शब्द खुद
            नहीं सुनता; यह निर्णय खिलाड़ियों का है।
          </li>
          <li>इशारे, अक्षर गिनना, “पहला अक्षर…” या दूसरी भाषा में अनुवाद करना मना है।</li>
          <li>समय खत्म होने पर बारी का हिसाब दिखता है। गलती से गलत बटन दबा हो तो वहीं सुधारें, फिर अगली टीम।</li>
        </ol>
        <h2>अभी के नियम</h2>
        <ul>
          <li>हर बारी: {hi.setup.seconds(r.turnSeconds)}</li>
          <li>सही उत्तर: +{r.pointsCorrect}</li>
          <li>मना शब्द: −{r.violationPenalty}{r.violationRecipient === 'opponents' ? ` (और हर विरोधी टीम को +${r.violationPenalty})` : ''}</li>
          <li>छोड़ना: {r.skipPenalty ? `−${r.skipPenalty}` : 'कोई कटौती नहीं'}{r.maxSkipsPerTurn !== null ? ` · हर बारी में अधिकतम ${r.maxSkipsPerTurn}` : ''}</li>
          <li>{r.recycleSkipped ? 'छोड़े गए कार्ड बाद में फिर आ सकते हैं' : 'एक खेल में कोई कार्ड दोबारा नहीं आता'}</li>
          <li>
            खेल का अंत: {end.type === 'rounds' ? `${end.rounds} राउंड के बाद` : `किसी टीम के ${end.target} अंक होने पर — उसी राउंड के अंत में, ताकि सबको बराबर बारियाँ मिलें`}
          </li>
          <li>समय पूरा होने पर स्क्रीन पर बचा कार्ड बिना अंक के चला जाता है।</li>
          <li>ऐप से बाहर जाने या फ़ोन लॉक होने पर समय अपने-आप रुक जाता है।</li>
        </ul>
        <p className="muted small">ये नियम “नया खेल” में बदले जा सकते हैं। एक राउंड = हर टीम की एक बारी। बराबर अंक होने पर मुकाबला बराबरी पर माना जाता है।</p>
      </article>
      <button type="button" className="btn primary block" onClick={() => navigate('setup')}>
        {hi.home.newGame}
      </button>
    </main>
  );
}
