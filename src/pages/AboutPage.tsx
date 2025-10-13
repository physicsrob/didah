import { HeaderBar } from '../components/HeaderBar'
import '../styles/main.css'
import '../styles/components.css'
import '../styles/aboutPage.css'

export default function AboutPage() {
  return (
    <div className="min-h-screen about-page-container">
      <HeaderBar pageTitle="About" />

      <div className="container container-centered">
        <div className="about-content">
          <h1 className="about-heading">About Morse Academy</h1>

          <p className="about-paragraph">
            In 2025, with the solar cycle absolutely roaring, I decided it was time to get back into ham radio. I'd dabbled with morse about 25 years ago when I first got licensed, managing a handful of awkward contacts before giving up. This time, I wanted to actually get good at it.
          </p>

          <p className="about-paragraph">
            So I dove into the world of morse code apps, expecting to find something polished and effective. What I found was... disappointing. Some apps had solid ideas buried under terrible interfaces. Others looked decent but were missing the features I actually needed. One thing I really craved was interesting text to practice copying. After weeks of searching, I realized that if I wanted a morse trainer that actually worked the way I thought it should, I'd have to build it myself.
          </p>

          <p className="about-paragraph">
            I'll be honest: without AI coding assistance, I never would have started this project. I know my strengths, and creating beautiful, modern interfaces isn't one of them. I could have cobbled together something functional, but it would have been just as clunky as the apps I was trying to replace. But in 2025, AI coding agents have changed what's possible for developers like me. They've made professional-quality UI accessible to engineers that previously wouldn't have touched HTML or CSS. Once I realized that I could build something genuinely good—not just functional—the decision to create Morse Academy was easy.
          </p>

          <p className="about-paragraph">
            The result is Morse Academy: interesting text sources, proper reveal timing, instant feedback, and an interface that doesn't fight you. Whether you're coming back to CW after decades or starting fresh, it's designed to make practice engaging rather than tedious. I built it because I needed it. If you're working on your morse skills, I hope it helps you too.
          </p>

          <div className="about-signature">
            <p>73,</p>
            <p>Rob Porter, NE6U</p>
          </div>
        </div>
      </div>
    </div>
  )
}
