export const TECH_DICTIONARY: Record<string, string[]> = {
  // Languages
  'Node.js': ['node.js', 'node js', 'nodejs', 'node'],
  'TypeScript': ['typescript', 'ts'],
  'JavaScript': ['javascript', 'js'],
  'Python': ['python', 'py'],
  'Java': ['java', 'j2ee'],
  'Go': ['golang', 'go'],
  'Ruby': ['ruby'],
  'PHP': ['php'],
  'C#': ['c#', 'csharp'],
  'C++': ['c++', 'cpp'],
  
  // Backend
  'NestJS': ['nestjs', 'nest'],
  'Spring Boot': ['spring boot', 'springboot', 'spring'],
  'Express': ['express', 'expressjs'],
  'Django': ['django'],
  'Flask': ['flask'],
  'Laravel': ['laravel'],
  'Ruby on Rails': ['ruby on rails', 'rails', 'ror'],
  '.NET': ['.net', 'dotnet'],

  // Frontend
  'React': ['react', 'reactjs', 'react.js'],
  'Next.js': ['nextjs', 'next.js', 'next'],
  'Vue.js': ['vue', 'vuejs', 'vue.js'],
  'Angular': ['angular', 'angularjs'],
  'Svelte': ['svelte'],

  // Databases
  'MongoDB': ['mongodb', 'mongo'],
  'PostgreSQL': ['postgresql', 'postgres'],
  'MySQL': ['mysql'],
  'Redis': ['redis'],
  'Elasticsearch': ['elasticsearch', 'elastic'],

  // Cloud / DevOps
  'AWS': ['aws', 'amazon web services'],
  'GCP': ['gcp', 'google cloud'],
  'Azure': ['azure'],
  'Docker': ['docker', 'containerization'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration'],
  'Terraform': ['terraform'],

  // AI / LLM
  'LLM': ['llm', 'large language model', 'llms'],
  'Generative AI': ['generative ai', 'genai', 'gen ai'],
  'RAG': ['rag', 'retrieval-augmented generation', 'retrieval augmented generation'],
  'LangChain': ['langchain'],
  'LlamaIndex': ['llamaindex'],
  'TensorFlow': ['tensorflow', 'tf'],
  'PyTorch': ['pytorch'],
};

export function extractTechnologies(text: string): string[] {
  const foundTechs = new Set<string>();
  const normalizedText = text.toLowerCase();

  for (const [primaryName, aliases] of Object.entries(TECH_DICTIONARY)) {
    for (const alias of aliases) {
      // Escape regex special characters
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Determine if we need word boundaries based on the first and last character of the alias.
      // If it starts with a word character (a-z, 0-9, _), we need a leading boundary.
      const startsWithWordChar = /^\w/.test(alias);
      const endsWithWordChar = /\w$/.test(alias);

      const prefix = startsWithWordChar ? '\\b' : '(?:^|\\W)';
      const suffix = endsWithWordChar ? '\\b' : '(?:\\W|$)';

      const regex = new RegExp(prefix + escapedAlias + suffix, 'i');
      
      if (regex.test(normalizedText)) {
        foundTechs.add(primaryName);
        break; // Found this tech, no need to check other aliases for it
      }
    }
  }

  return Array.from(foundTechs);
}
