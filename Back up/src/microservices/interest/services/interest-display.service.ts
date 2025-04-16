import { Injectable } from "@nestjs/common";
import { Interest } from "../entities/interest.entity";
import {
  InterestDisplayContext,
  InterestDisplayProps,
} from "../interfaces/interest.interface";

@Injectable()
export class InterestDisplayService {
  /**
   * Get appropriate display properties for interest based on context
   */
  getInterestDisplayProps(
    interest: Interest,
    context: InterestDisplayContext,
  ): InterestDisplayProps {
    // Default display properties
    const props: InterestDisplayProps = {
      name: interest.name,
      useEmoji: true,
      displayIcon: interest.icon,
      size: "medium",
    };

    // Override properties based on context
    switch (context) {
      case InterestDisplayContext.PROFILE:
      case InterestDisplayContext.POST:
        props.useEmoji = true;
        props.size = "small";
        break;

      case InterestDisplayContext.PLAN:
        props.useEmoji = true;
        props.size = "medium";
        break;

      case InterestDisplayContext.EXPLORE:
        if (!interest.isIconEmoji && interest.imageUrl) {
          props.useEmoji = false;
          props.displayIcon = interest.imageUrl;
        }
        props.size = "large";
        break;

      case InterestDisplayContext.SELECTION:
        props.useEmoji = true;
        props.size = "medium";
        break;
    }

    return props;
  }

  /**
   * Generate CSS class name for an interest based on context
   */
  getInterestClassName(
    interest: Interest,
    context: InterestDisplayContext,
  ): string {
    const baseClass = "interest";
    const contextClass = `interest--${context.toLowerCase()}`;
    const sizeClass = `interest--${this.getInterestDisplayProps(interest, context).size}`;
    const typeClass = interest.isIconEmoji
      ? "interest--emoji"
      : "interest--image";

    return `${baseClass} ${contextClass} ${sizeClass} ${typeClass}`;
  }

  /**
   * Get image path for an interest (for non-emoji icons)
   * Fallbacks to a generated path if imageUrl is not provided
   */
  getInterestImagePath(interest: Interest): string {
    if (interest.imageUrl) {
      return interest.imageUrl;
    }

    // Generate a default path based on interest name
    const normalizedName = interest.name.toLowerCase().replace(/\s+/g, "-");
    return `/assets/interests/${normalizedName}.jpg`;
  }
}
