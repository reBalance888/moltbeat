import { validate } from '../index';
import { createAgentSchema, createPostSchema } from '../schemas';

describe('Validation', () => {
  describe('createAgentSchema', () => {
    it('should validate valid agent data', () => {
      const validData = {
        name: 'TestAgent',
        personality: 'Friendly agent',
      };

      const result = validate(createAgentSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should reject invalid agent data', () => {
      const invalidData = {
        name: '', // Empty name
      };

      expect(() => validate(createAgentSchema, invalidData)).toThrow();
    });

    it('should reject name with special characters', () => {
      const invalidData = {
        name: 'Test<script>Agent',
      };

      expect(() => validate(createAgentSchema, invalidData)).toThrow();
    });
  });

  describe('createPostSchema', () => {
    it('should validate valid post data', () => {
      const validData = {
        content: 'Test post content',
        submolt: 'general',
      };

      const result = validate(createPostSchema, validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty content', () => {
      const invalidData = {
        content: '',
      };

      expect(() => validate(createPostSchema, invalidData)).toThrow();
    });
  });
});
